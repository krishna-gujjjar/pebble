import { isoDay, median } from "./format";
import type { Txn } from "./types";

export const salaryStats = (txns: Txn[]) => {
  const sals = txns
    .filter((t) => t.kind === "income" && t.category === "Salary")
    .toSorted((a, b) => (a.date < b.date ? -1 : 1));
  if (!sals.length) {
    return { avg: 0, count: 0, lastDate: "" };
  }
  const last = sals.at(-1);
  return {
    avg: median(sals.slice(-4).map((s) => s.amount)),
    count: sals.length,
    lastDate: last?.date ?? "",
  };
};

export const nextPayday = (payday: number, now: Date): string => {
  const y = now.getFullYear();
  const m = now.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const day = Math.min(Math.max(1, payday || 1), dim);
  const thisMonth = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (thisMonth >= isoDay(now)) {
    return thisMonth;
  }
  const nm = new Date(y, m + 1, 1);
  const dim2 = new Date(nm.getFullYear(), nm.getMonth() + 1, 0).getDate();
  const d2 = Math.min(Math.max(1, payday || 1), dim2);
  return `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, "0")}-${String(d2).padStart(2, "0")}`;
};
