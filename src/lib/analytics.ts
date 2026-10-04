import { diffDays, median } from "./format";
import type { Txn } from "./types";

export const categoryMedian = (txns: Txn[], category: string): number =>
  median(
    txns.flatMap((t) =>
      t.kind === "expense" && t.category === category ? [t.amount] : []
    )
  );

export interface RecurringCandidate {
  title: string;
  amount: number;
  category: string;
  count: number;
}

export const detectRecurringCandidates = (
  txns: Txn[]
): RecurringCandidate[] => {
  const groups = new Map<string, Txn[]>();
  for (const t of txns.filter((x) => x.kind === "expense")) {
    if (t.note.trim().length < 3) {
      continue;
    }
    // Variable bill aware: group by normalized title only, not title+amount (electricity/water/gas vary)
    const key = t.note.toLowerCase().trim();
    const list = groups.get(key);
    if (list) {
      list.push(t);
    } else {
      groups.set(key, [t]);
    }
  }
  const out: RecurringCandidate[] = [];
  for (const [, arr] of groups) {
    if (arr.length < 2) {
      continue;
    }
    const dates = arr.map((a) => a.date).toSorted();
    let monthly = true;
    for (let i = 1; i < dates.length; i += 1) {
      const gap = diffDays(dates[i], dates[i - 1]);
      if (gap < 20 || gap > 45) {
        monthly = false;
        break;
      }
    }
    if (monthly) {
      const avg = arr.reduce((s, x) => s + x.amount, 0) / arr.length;
      out.push({
        amount: Math.round(avg * 100) / 100,
        category: arr[0].category,
        count: dates.length,
        title: arr[0].note,
      });
    }
  }
  return out.slice(0, 4);
};
