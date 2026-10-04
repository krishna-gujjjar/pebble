import { round2 } from "./format";
import type { Tab } from "./tabs";

export type GoAction =
  | { kind: "promise-settle"; uid: string }
  | { kind: "card-bill"; amount: number; due: string }
  | { kind: "quick"; quick: "expense" | "income" }
  | { kind: "tab"; tab: Tab }
  | { kind: "none" };

const TABS = new Set([
  "home",
  "transactions",
  "lending",
  "recurring",
  "reports",
  "insights",
  "care",
]);

/**
 * Insights carry a `go` string (e.g. "card-bill:120:2026-09-05") so the view
 * stays dumb. This is the single place that decodes them.
 */
export const parseGo = (dest: string): GoAction => {
  if (dest.startsWith("promise-settle:")) {
    return { kind: "promise-settle", uid: dest.slice(15) };
  }
  if (dest.startsWith("card-bill:")) {
    const [, amount, due] = dest.split(":");
    return { amount: Number(amount) || 0, due: due || "", kind: "card-bill" };
  }
  if (dest === "add-expense") {
    return { kind: "quick", quick: "expense" };
  }
  if (dest === "add-income") {
    return { kind: "quick", quick: "income" };
  }
  if (TABS.has(dest)) {
    // SAFETY: TABS holds exactly the literal Tab ids, so membership proves the type.
    return { kind: "tab", tab: dest as Tab };
  }
  return { kind: "none" };
};

export const cardBillGo = (amount: number, due: string): string =>
  `card-bill:${round2(amount)}:${due}`;
