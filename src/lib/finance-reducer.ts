import { CARD_SETTLE_METHOD } from "./card";
import { addDays, addMonths, compareDateStrings } from "./format";
import {
  createLoan,
  createRecurring,
  deleteLoanRecord,
  payRecurring,
  repayLoan,
  settleLoan,
  updateRecurring,
} from "./ops";
import type { LoanRecord, RecRecord } from "./ops";
import { isBillMatch } from "./recurring";
import { defaultSettings } from "./store";
import type { IncomePromise, Loan, Recurring, Settings, Txn } from "./types";

export interface FinState {
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
  settings: Settings;
  dismissed: string[];
}

export type FinAction =
  | { type: "add-txn"; txn: Txn }
  | { type: "update-txn"; txn: Txn }
  | { type: "delete-txn"; uid: string }
  | { type: "add-loan"; opts: LoanRecord }
  | { type: "repay-loan"; uid: string; amt: number }
  | { type: "settle-loan"; uid: string }
  | { type: "delete-loan"; uid: string }
  | { type: "add-rec"; f: RecRecord }
  | { type: "update-rec"; uid: string; f: Partial<RecRecord> }
  | { type: "toggle-rec"; uid: string }
  | { type: "delete-rec"; uid: string }
  | { type: "pay-rec"; uid: string }
  | { type: "add-promise"; p: IncomePromise }
  | { type: "settle-promise"; uid: string }
  | { type: "set-settings"; s: Settings }
  | { type: "ack"; date: string; category: string }
  | { type: "set-dismissed"; ids: string[] }
  | {
      type: "replace";
      txns: Txn[];
      loans: Loan[];
      recurrings: Recurring[];
      promises: IncomePromise[];
      settings: Settings;
    }
  | { type: "wipe" };

const isTrackedBillFrequency = (frequency: Recurring["frequency"]): boolean =>
  frequency === "monthly" || frequency === "variable" || frequency === "yearly";

const nextDueAfterPayment = (
  frequency: Recurring["frequency"],
  date: string
): string => {
  if (frequency === "variable") {
    return addDays(date, 50);
  }
  const months = frequency === "yearly" ? 12 : 1;
  return addMonths(date, months);
};

const updateBillFromTransaction = (
  recurring: Recurring,
  txn: Txn
): Recurring => {
  const alreadyPaidOnOrAfter =
    recurring.lastPaid !== undefined && txn.date <= recurring.lastPaid;
  if (
    !recurring.active ||
    !isTrackedBillFrequency(recurring.frequency) ||
    !isBillMatch(recurring.title, txn.note) ||
    alreadyPaidOnOrAfter
  ) {
    return recurring;
  }

  const nextDue = nextDueAfterPayment(recurring.frequency, txn.date);
  if (recurring.card) {
    return {
      ...recurring,
      lastPaid: txn.date,
      nextDue,
      settlements: [
        ...(recurring.settlements ?? []),
        {
          amount: txn.amount,
          date: txn.date,
          pay: txn.payment || CARD_SETTLE_METHOD,
        },
      ],
    };
  }

  const amounts = [
    ...(recurring.amounts ?? [recurring.amount]),
    txn.amount,
  ].filter((amount) => amount > 0);
  const average =
    amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
  return {
    ...recurring,
    amount: amounts.length > 1 ? Math.round(average * 100) / 100 : txn.amount,
    amounts,
    averageAmount: Math.round(average * 100) / 100,
    lastPaid: txn.date,
    latestAmount: txn.amount,
    nextDue,
    occurrences: amounts.length,
  };
};

const updateBillsFromTransaction = (
  recurrings: Recurring[],
  txn: Txn
): Recurring[] => {
  if (txn.kind !== "expense") {
    return recurrings;
  }
  return recurrings.map((recurring) =>
    updateBillFromTransaction(recurring, txn)
  );
};

const restoreRecurringBill = (recurring: Recurring, txns: Txn[]): Recurring => {
  const rec = { ...recurring };
  const lowerTitle = rec.title.toLowerCase();
  if (
    (lowerTitle.includes("gas") && lowerTitle.includes("cylinder")) ||
    lowerTitle.includes("lpg")
  ) {
    rec.frequency = "variable";
  }
  if (!rec.active || !isTrackedBillFrequency(rec.frequency)) {
    return rec;
  }

  const matches = txns
    .filter((txn) => txn.kind === "expense" && isBillMatch(rec.title, txn.note))
    .toSorted((a, b) => compareDateStrings(a.date, b.date));
  const latest = matches.at(-1);
  if (!latest) {
    return rec;
  }

  if (rec.lastPaid && rec.lastPaid > latest.date) {
    if (rec.nextDue < rec.lastPaid) {
      return {
        ...rec,
        nextDue: nextDueAfterPayment(rec.frequency, rec.lastPaid),
      };
    }
    return rec;
  }

  const nextDue = nextDueAfterPayment(rec.frequency, latest.date);
  if (rec.card) {
    const mergedSettlements = [
      ...(rec.settlements ?? []),
      ...matches.map((txn) => ({
        amount: txn.amount,
        date: txn.date,
        pay: txn.payment,
      })),
    ].toSorted((a, b) => compareDateStrings(a.date, b.date));
    const seen = new Set<string>();
    const deduped = mergedSettlements.filter((settlement) => {
      const key = `${settlement.date}|${settlement.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    const lastSettlement = deduped.at(-1);
    if (!lastSettlement) {
      return rec;
    }
    const cardNextDue =
      rec.frequency === "variable"
        ? addDays(lastSettlement.date, 50)
        : addMonths(lastSettlement.date, 1);
    return {
      ...rec,
      lastPaid: lastSettlement.date,
      nextDue: cardNextDue,
      settlements: deduped,
    };
  }

  const amounts = matches.map((txn) => txn.amount);
  const average =
    amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
  return {
    ...rec,
    amount:
      amounts.length > 1 ? Math.round(average * 100) / 100 : latest.amount,
    amounts,
    averageAmount: Math.round(average * 100) / 100,
    lastPaid: latest.date,
    latestAmount: latest.amount,
    nextDue,
    occurrences: amounts.length,
  };
};

const restoreRecurringBills = (
  recurrings: Recurring[],
  txns: Txn[]
): Recurring[] =>
  recurrings.map((recurring) => restoreRecurringBill(recurring, txns));

export const financeReducer = (
  state: FinState,
  action: FinAction
): FinState => {
  switch (action.type) {
    case "add-txn": {
      return {
        ...state,
        recurrings: updateBillsFromTransaction(state.recurrings, action.txn),
        txns: [action.txn, ...state.txns],
      };
    }
    case "update-txn": {
      return {
        ...state,
        txns: state.txns.map((t) =>
          t.uid === action.txn.uid ? action.txn : t
        ),
      };
    }
    case "delete-txn": {
      return { ...state, txns: state.txns.filter((t) => t.uid !== action.uid) };
    }
    case "add-loan": {
      const { loan, txns } = createLoan(action.opts);
      return {
        ...state,
        loans: [loan, ...state.loans],
        txns: [...txns, ...state.txns],
      };
    }
    case "repay-loan": {
      const r = repayLoan(state.loans, state.txns, action.uid, action.amt);
      return { ...state, loans: r.loans, txns: r.txns };
    }
    case "settle-loan": {
      const r = settleLoan(state.loans, state.txns, action.uid);
      return { ...state, loans: r.loans, txns: r.txns };
    }
    case "delete-loan": {
      const r = deleteLoanRecord(state.loans, state.txns, action.uid);
      return { ...state, loans: r.loans, txns: r.txns };
    }
    case "add-rec": {
      return {
        ...state,
        recurrings: [...state.recurrings, createRecurring(action.f)],
      };
    }
    case "update-rec": {
      return {
        ...state,
        recurrings: state.recurrings.map((r) =>
          r.uid === action.uid ? updateRecurring(r, action.f) : r
        ),
      };
    }
    case "toggle-rec": {
      return {
        ...state,
        recurrings: state.recurrings.map((r) =>
          r.uid === action.uid ? { ...r, active: !r.active } : r
        ),
      };
    }
    case "delete-rec": {
      return {
        ...state,
        recurrings: state.recurrings.filter((r) => r.uid !== action.uid),
      };
    }
    case "pay-rec": {
      const r = payRecurring(state.recurrings, state.txns, action.uid);
      return { ...state, recurrings: r.recurrings, txns: r.txns };
    }
    case "add-promise": {
      return { ...state, promises: [...state.promises, action.p] };
    }
    case "settle-promise": {
      return {
        ...state,
        promises: state.promises.filter((p) => p.uid !== action.uid),
      };
    }
    case "set-settings": {
      return { ...state, settings: action.s };
    }
    case "ack": {
      return {
        ...state,
        settings: {
          ...state.settings,
          incomeAcks: {
            ...state.settings.incomeAcks,
            [`${action.date.slice(0, 7)}|${action.category}`]: "1",
          },
        },
      };
    }
    case "set-dismissed": {
      return { ...state, dismissed: action.ids };
    }
    case "replace": {
      const fixedRecurrings = restoreRecurringBills(
        action.recurrings,
        action.txns
      );
      return {
        dismissed: [],
        loans: action.loans,
        promises: action.promises,
        recurrings: fixedRecurrings,
        settings: action.settings,
        txns: action.txns,
      };
    }
    case "wipe": {
      return {
        ...state,
        dismissed: [],
        loans: [],
        promises: [],
        recurrings: [],
        settings: defaultSettings(),
        txns: [],
      };
    }
    default: {
      return state;
    }
  }
};
