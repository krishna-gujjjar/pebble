import { isoDay, monthKey } from "./format";
import { uid } from "./store";
import type { IncomePromise, Txn } from "./types";

/** categories where a short payment usually means more is coming later */
export const PARTIAL_INCOME_CATS = ["Salary", "Freelance", "Business"];

export const ackKey = (date: string, category: string): string =>
  `${monthKey(date)}|${category}`;

/** an income entry below your usual take-home should trigger the "where's the rest?" question */
export const shouldPromptIncome = (
  entry: Txn,
  expectedSalary: number,
  acked: Record<string, string>
): boolean => {
  if (entry.kind !== "income") {
    return false;
  }
  if (expectedSalary <= 0) {
    return false;
  }
  if (!PARTIAL_INCOME_CATS.includes(entry.category)) {
    return false;
  }
  if (entry.amount >= expectedSalary) {
    return false;
  }
  return acked[ackKey(entry.date, entry.category)] === undefined;
};

export const makePromise = (
  entry: Txn,
  expectedTotal: number,
  due: string
): IncomePromise => {
  const expected = Math.max(entry.amount, expectedTotal);
  return {
    category: entry.category,
    createdAt: new Date().toISOString(),
    due,
    expected,
    month: monthKey(entry.date),
    note: entry.note || entry.category,
    uid: uid("pm"),
  };
};

/** days the promise is past its due date (negative = not due yet; -1 if no due date) */
export const overdueDays = (
  p: IncomePromise,
  today = isoDay(new Date())
): number => {
  if (!p.due) {
    return -1;
  }
  const d = new Date(`${p.due}T00:00:00`).getTime();
  const t = new Date(`${today}T00:00:00`).getTime();
  return Math.round((t - d) / 86_400_000);
};
