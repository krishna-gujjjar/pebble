import { CARD_SETTLE_METHOD } from "./card";
import { addDays, addMonths } from "./format";
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

export const financeReducer = (
  state: FinState,
  action: FinAction
): FinState => {
  switch (action.type) {
    case "add-txn": {
      const { txn } = action;
      // Auto-mark recurring bills as paid when transaction with same name added (monthly + variable bills)
      // ponytail: reuse isBillMatch, stdlib Date, minimal code
      let updatedRecurrings = state.recurrings;
      if (txn.kind === "expense") {
        const today = txn.date;
        updatedRecurrings = state.recurrings.map((r) => {
          if (!r.active) {
            return r;
          }
          if (
            r.frequency !== "monthly" &&
            r.frequency !== "variable" &&
            r.frequency !== "yearly"
          ) {
            return r;
          }
          if (!isBillMatch(r.title, txn.note)) {
            return r;
          }
          if (r.lastPaid && today < r.lastPaid) {
            return r;
          }
          if (r.lastPaid && today === r.lastPaid) {
            return r;
          }
          let nextDue: string;
          if (r.frequency === "variable") {
            nextDue = addDays(today, 50);
          } else {
            nextDue = addMonths(today, r.frequency === "yearly" ? 12 : 1);
          }
          if (r.card) {
            return {
              ...r,
              lastPaid: today,
              nextDue,
              settlements: [
                ...(r.settlements ?? []),
                {
                  amount: txn.amount,
                  date: today,
                  pay: txn.payment || CARD_SETTLE_METHOD,
                },
              ],
            };
          }
          const amounts = [...(r.amounts ?? [r.amount]), txn.amount].filter(
            (a) => a > 0
          );
          const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          return {
            ...r,
            amount:
              amounts.length > 1 ? Math.round(avg * 100) / 100 : txn.amount,
            amounts,
            averageAmount: Math.round(avg * 100) / 100,
            lastPaid: today,
            latestAmount: txn.amount,
            nextDue,
            occurrences: amounts.length,
          };
        });
      }
      return {
        ...state,
        recurrings: updatedRecurrings,
        txns: [txn, ...state.txns],
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
      // On restore, auto-link existing transactions to monthly/variable bills (same name) and update lastPaid/nextDue
      // FIX: previously sorted descending and picked oldest as latest → Next due Apr 22 Last paid Mar 22 bug
      // Now sort ascending, pick max date as latest, preserve variable handling
      const fixedRecurrings = action.recurrings.map((r) => {
        const rec = { ...r };
        const lowerTitle = rec.title.toLowerCase();
        if (
          (lowerTitle.includes("gas") && lowerTitle.includes("cylinder")) ||
          lowerTitle.includes("lpg")
        ) {
          rec.frequency = "variable";
        }
        if (!rec.active) {
          return rec;
        }
        if (
          rec.frequency !== "monthly" &&
          rec.frequency !== "variable" &&
          rec.frequency !== "yearly"
        ) {
          return rec;
        }
        const matches = action.txns
          .filter((t) => t.kind === "expense" && isBillMatch(rec.title, t.note))
          .toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        if (matches.length === 0) {
          return rec;
        }
        const latest = matches.at(-1);
        if (rec.lastPaid && rec.lastPaid > latest.date) {
          // existing is already newer, keep it but ensure nextDue is correct
          let nextDueExisting: string;
          if (rec.frequency === "variable") {
            nextDueExisting = addDays(rec.lastPaid, 50);
          } else {
            nextDueExisting = addMonths(
              rec.lastPaid,
              rec.frequency === "yearly" ? 12 : 1
            );
          }
          // if existing nextDue is before today or before latest+freq, fix it
          if (rec.nextDue < rec.lastPaid) {
            return { ...rec, nextDue: nextDueExisting };
          }
          return rec;
        }
        let nextDue: string;
        if (rec.frequency === "variable") {
          nextDue = addDays(latest.date, 50);
        } else {
          nextDue = addMonths(latest.date, rec.frequency === "yearly" ? 12 : 1);
        }
        if (rec.card) {
          // merge settlements: keep existing + matches, sorted, dedup by date
          const mergedSettlements = [
            ...(rec.settlements ?? []),
            ...matches.map((m) => ({
              amount: m.amount,
              date: m.date,
              pay: m.payment,
            })),
          ].toSorted((a, b) =>
            a.date < b.date ? -1 : a.date > b.date ? 1 : 0
          );
          // dedup by date+amount
          const seen = new Set<string>();
          const deduped = mergedSettlements.filter((s) => {
            const k = `${s.date}|${s.amount}`;
            if (seen.has(k)) {
              return false;
            }
            seen.add(k);
            return true;
          });
          const lastSettle = deduped.at(-1) ?? {
            amount: latest.amount,
            date: latest.date,
          };
          return {
            ...rec,
            lastPaid: lastSettle.date,
            nextDue:
              rec.frequency === "variable"
                ? addDays(lastSettle.date, 50)
                : addMonths(lastSettle.date, 1),
            settlements: deduped,
          };
        }
        const amounts = matches.map((m) => m.amount);
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        return {
          ...rec,
          amount:
            amounts.length > 1 ? Math.round(avg * 100) / 100 : latest.amount,
          amounts,
          averageAmount: Math.round(avg * 100) / 100,
          lastPaid: latest.date,
          latestAmount: latest.amount,
          nextDue,
          occurrences: amounts.length,
        };
      });
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
