import { isoDay, monthKey, pad, parseDay } from "./format";
import { inRange } from "./period";
import type { Range } from "./period";
import type { CardSettlement, Recurring, Txn } from "./types";

/** payment methods offered in the add/edit forms */
export const PAY_METHODS = ["Cash", "UPI", "Card", "Bank"];

export const CARD = "Card";

/**
 * Credit cards are the one method where money leaves later, so Pebble counts
 * card spending in the month it happened and never counts the bill payment
 * again (that would double-count the same money).
 */
export const cardBillLabel = "Credit card bill";

export const cardSpendIn = (txns: Txn[], key: string): number => {
  let total = 0;
  for (const t of txns) {
    if (
      t.kind === "expense" &&
      t.payment === CARD &&
      monthKey(t.date) === key &&
      !t.loanUid
    ) {
      total += t.amount;
    }
  }
  return total;
};

/** card spending strictly after a date (used to see if a statement has new charges) */
export const cardSpendSince = (txns: Txn[], since: string): number => {
  let total = 0;
  for (const t of txns) {
    if (
      t.kind === "expense" &&
      t.payment === CARD &&
      !t.loanUid &&
      t.date > since
    ) {
      total += t.amount;
    }
  }
  return total;
};

const monthKeyOf = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** statement of the previous month, for the card */
export const lastStatement = (
  txns: Txn[],
  now: Date
): { amount: number; key: string } => {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key = monthKeyOf(prev);
  return { amount: cardSpendIn(txns, key), key };
};

/** the day a card statement usually lands - a gentle default, editable later */
export const DEFAULT_CARD_DAY = 5;

/** due date for the current statement: this month's day, or next month if passed */
const dayIn = (year: number, month: number, day: number): string => {
  const dim = new Date(year, month + 1, 0).getDate();
  return isoDay(new Date(year, month, Math.min(Math.max(1, day), dim)));
};

/** bill day inside the current month, whether or not it has already passed */
export const cardBillDayThisMonth = (
  now: Date,
  day = DEFAULT_CARD_DAY
): string => dayIn(now.getFullYear(), now.getMonth(), day);

/** the next bill day still ahead of today (this month's, else next month's) */
export const cardBillDue = (now: Date, day = DEFAULT_CARD_DAY): string => {
  const thisMonth = cardBillDayThisMonth(now, day);
  if (thisMonth >= isoDay(now)) {
    return thisMonth;
  }
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return dayIn(next.getFullYear(), next.getMonth(), day);
};

/** label like "Aug 2026" for a statement period */
export const statementLabel = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) {
    return key;
  }
  return parseDay(`${key}-01`).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export const findCardBill = (recurrings: Recurring[]): Recurring | undefined =>
  recurrings.find((r) => Boolean(r.card));

/** how a card bill is normally cleared - recorded so the audit stays honest */
export const CARD_SETTLE_METHOD = "Bank";

/** bill payments made inside a period (newest first) */
export const settlementsIn = (
  recurrings: Recurring[],
  range: Range
): CardSettlement[] => {
  const out: CardSettlement[] = [];
  for (const bill of recurrings) {
    for (const s of bill.settlements ?? []) {
      if (inRange(s.date, range)) {
        out.push(s);
      }
    }
  }
  return out.toSorted((a, b) => (a.date < b.date ? 1 : -1));
};
