import { isoDay, monthLabel, pad } from "./format";
import type { Txn } from "./types";

export type Period = "month" | "quarter" | "half" | "year";

export interface Range {
  from: string;
  label: string;
  to: string;
}

export const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "Monthly" },
  { id: "quarter", label: "Quarterly" },
  { id: "half", label: "Half-yearly" },
  { id: "year", label: "Yearly" },
];

const STEP: Record<Period, number> = {
  half: 6,
  month: 1,
  quarter: 3,
  year: 12,
};

const startMonthFor = (period: Period, month: number): number => {
  if (period === "year") {
    return 0;
  }
  if (period === "half") {
    return month < 6 ? 0 : 6;
  }
  if (period === "quarter") {
    return Math.floor(month / 3) * 3;
  }
  return month;
};

const labelFor = (period: Period, from: Date): string => {
  const year = from.getFullYear();
  if (period === "year") {
    return String(year);
  }
  if (period === "half") {
    return `H${from.getMonth() < 6 ? 1 : 2} ${year}`;
  }
  if (period === "quarter") {
    return `Q${Math.floor(from.getMonth() / 3) + 1} ${year}`;
  }
  return monthLabel(`${year}-${pad(from.getMonth() + 1)}`);
};

/** the calendar window for a period, walking back `offset` periods from today */
export const rangeFor = (period: Period, now: Date, offset = 0): Range => {
  const step = STEP[period];
  const shifted = new Date(
    now.getFullYear(),
    now.getMonth() - offset * step,
    1
  );
  const from = new Date(
    shifted.getFullYear(),
    startMonthFor(period, shifted.getMonth()),
    1
  );
  const to = new Date(from.getFullYear(), from.getMonth() + step, 0);
  return { from: isoDay(from), label: labelFor(period, from), to: isoDay(to) };
};

export const inRange = (date: string, r: Range): boolean =>
  date >= r.from && date <= r.to;

export const rangeTxns = (txns: Txn[], r: Range): Txn[] =>
  txns.filter((t) => inRange(t.date, r));

export interface Totals {
  card: number;
  exp: number;
  inc: number;
  n: number;
}

/** one pass over the period: totals plus how much of the spending rode on card */
export const totalsFor = (items: Txn[], cardMethod: string): Totals => {
  let card = 0;
  let exp = 0;
  let inc = 0;
  for (const t of items) {
    if (t.kind === "income") {
      inc += t.amount;
    } else {
      exp += t.amount;
      if (t.payment === cardMethod) {
        card += t.amount;
      }
    }
  }
  return { card, exp, inc, n: items.length };
};
