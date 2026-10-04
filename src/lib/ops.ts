import { CARD_SETTLE_METHOD } from "./card";
import { addDays, addMonths, isoDay, round2 } from "./format";
import { uid } from "./store";
import type { Loan, Recurring, Txn } from "./types";

export interface LoanRecord {
  amount: number;
  direction: "lent" | "borrowed";
  person: string;
  note: string;
  date: string;
  dueDate: string;
}

export interface RecRecord {
  title: string;
  amount: number;
  category: string;
  frequency: "monthly" | "weekly" | "yearly" | "variable";
  nextDue: string;
  /** credit-card bill: settle it without logging any spending */
  card?: boolean;
}

export const mirror = (
  loanUid: string,
  kind: "expense" | "income",
  amount: number,
  note: string,
  date: string
): Txn => ({
  amount: round2(amount),
  category: "Lending",
  createdAt: new Date().toISOString(),
  date,
  kind,
  loanUid,
  note,
  payment: "Cash",
  uid: uid("t"),
});

export const createLoan = (opts: LoanRecord) => {
  const loan: Loan = {
    amount: opts.amount,
    createdAt: new Date().toISOString(),
    date: opts.date || isoDay(new Date()),
    direction: opts.direction,
    dueDate: opts.dueDate || "",
    note: opts.note,
    person: opts.person,
    repaid: 0,
    status: "open",
    uid: uid("l"),
  };
  const kind =
    loan.direction === "lent" ? ("expense" as const) : ("income" as const);
  const note =
    loan.note ||
    (loan.direction === "lent"
      ? `Lent to ${loan.person}`
      : `Borrowed from ${loan.person}`);
  return { loan, txns: [mirror(loan.uid, kind, loan.amount, note, loan.date)] };
};

export const repayLoan = (
  loans: Loan[],
  txns: Txn[],
  uidV: string,
  amt: number
) => {
  const l = loans.find((x) => x.uid === uidV);
  if (!l) {
    return { loans, txns };
  }
  const safeAmt = round2(Math.max(0, amt));
  if (safeAmt <= 0) {
    return { loans, txns };
  }
  const remaining = round2(Math.max(0, l.amount - l.repaid));
  const capped = Math.min(safeAmt, remaining || safeAmt);
  const repaid = round2(Math.min(l.amount, l.repaid + capped));
  const status = repaid >= l.amount ? ("settled" as const) : l.status;
  const note =
    l.direction === "lent"
      ? `Repayment received from ${l.person}`
      : `Paid back to ${l.person}`;
  return {
    loans: loans.map((x) => (x.uid === uidV ? { ...x, repaid, status } : x)),
    txns: [
      mirror(
        uidV,
        l.direction === "lent" ? "income" : "expense",
        capped,
        note,
        isoDay(new Date())
      ),
      ...txns,
    ],
  };
};

export const settleLoan = (loans: Loan[], txns: Txn[], uidV: string) => {
  const l = loans.find((x) => x.uid === uidV);
  if (!l) {
    return { loans, txns };
  }
  const remaining = round2(Math.max(0, l.amount - l.repaid));
  const next = loans.map((x) =>
    x.uid === uidV ? { ...x, repaid: x.amount, status: "settled" as const } : x
  );
  if (remaining <= 0) {
    return { loans: next, txns };
  }
  const note =
    l.direction === "lent"
      ? `Remaining from ${l.person} - settled`
      : `Remaining to ${l.person} - settled`;
  return {
    loans: next,
    txns: [
      mirror(
        uidV,
        l.direction === "lent" ? "income" : "expense",
        remaining,
        note,
        isoDay(new Date())
      ),
      ...txns,
    ],
  };
};

export const deleteLoanRecord = (loans: Loan[], txns: Txn[], uidV: string) => ({
  loans: loans.filter((l) => l.uid !== uidV),
  txns: txns.filter((t) => t.loanUid !== uidV),
});

export const createRecurring = (f: RecRecord): Recurring => ({
  active: true,
  amount: f.amount,
  amounts: [f.amount],
  averageAmount: f.amount,
  card: Boolean(f.card),
  category: f.category,
  createdAt: new Date().toISOString(),
  frequency: f.frequency,
  lastPaid: "",
  latestAmount: f.amount,
  nextDue: f.nextDue,
  occurrences: 1,
  title: f.title,
  uid: uid("r"),
});

export const updateRecurring = (
  existing: Recurring,
  f: Partial<RecRecord> & { title?: string; amount?: number }
): Recurring => {
  // ponytail: reuse existing, stdlib, minimal code – preserve variable bill handling
  const nextTitle = f.title ?? existing.title;
  const nextCategory = f.category ?? existing.category;
  const nextFreq = f.frequency ?? existing.frequency;
  const nextDue = f.nextDue ?? existing.nextDue;
  const nextCard = f.card === undefined ? existing.card : Boolean(f.card);

  if (f.amount === undefined) {
    return {
      ...existing,
      card: nextCard,
      category: nextCategory,
      frequency: nextFreq,
      nextDue,
      title: nextTitle,
    };
  }

  const newAmt = round2(f.amount);
  const isVariable =
    existing.frequency === "variable" ||
    nextFreq === "variable" ||
    (existing.amounts && existing.amounts.length > 1);

  if (!isVariable) {
    return {
      ...existing,
      amount: newAmt,
      amounts: [newAmt],
      averageAmount: newAmt,
      card: nextCard,
      category: nextCategory,
      frequency: nextFreq,
      latestAmount: newAmt,
      nextDue,
      occurrences: 1,
      title: nextTitle,
    };
  }

  // Variable bill: preserve history, update latest, recalc avg
  const prevAmounts = existing.amounts ?? [existing.amount];
  const newAmounts = [...prevAmounts];
  if (newAmounts.length > 0 && newAmounts.at(-1) === existing.latestAmount) {
    newAmounts[newAmounts.length - 1] = newAmt;
  } else if (newAmounts.at(-1) !== newAmt) {
    newAmounts[newAmounts.length - 1] = newAmt;
  }
  const avg = round2(newAmounts.reduce((a, b) => a + b, 0) / newAmounts.length);

  return {
    ...existing,
    amount: avg,
    amounts: newAmounts,
    averageAmount: avg,
    card: nextCard,
    category: nextCategory,
    frequency: nextFreq,
    latestAmount: newAmt,
    nextDue,
    occurrences: newAmounts.length,
    title: nextTitle,
  };
};

export const payRecurring = (
  recurrings: Recurring[],
  txns: Txn[],
  uidV: string
) => {
  const r = recurrings.find((x) => x.uid === uidV);
  if (!r) {
    return { recurrings, txns };
  }
  const today = isoDay(new Date());
  // FIX: use today as base for nextDue, not old r.nextDue which could be stale (Mar 22 → Apr 22 bug)
  // ponytail: stdlib Date, minimal code
  let next: string;
  if (r.frequency === "variable") {
    next = addDays(today, 50);
  } else if (r.frequency === "weekly") {
    next = addDays(today, 7);
  } else {
    const months = r.frequency === "yearly" ? 12 : 1;
    next = addMonths(today, months);
  }
  const settled = recurrings.map((x) =>
    x.uid === uidV
      ? {
          ...x,
          lastPaid: today,
          nextDue: next,
          settlements: x.card
            ? [
                ...(x.settlements ?? []),
                { amount: x.amount, date: today, pay: CARD_SETTLE_METHOD },
              ]
            : x.settlements,
        }
      : x
  );
  if (r.card) {
    return { recurrings: settled, txns };
  }
  const txn: Txn = {
    amount: r.amount,
    category: r.category,
    createdAt: new Date().toISOString(),
    date: today,
    kind: "expense",
    note: r.title,
    payment: "Bank",
    uid: uid("t"),
  };
  return {
    recurrings: settled,
    txns: [txn, ...txns],
  };
};
