import {
  cardSpendIn,
  findCardBill,
  lastStatement,
  statementLabel,
} from "./card";
import { diffDays, isoDay, money, monthKey, prettyDate } from "./format";
import { isOverdue } from "./recurring";
import type { InsightCtx, Recurring, Txn } from "./types";

export interface MonthTotals {
  exp: number;
  inc: number;
  n: number;
}

export const sumIn = (txns: Txn[], key: string): MonthTotals => {
  let exp = 0;
  let inc = 0;
  let n = 0;
  for (const t of txns) {
    if (monthKey(t.date) !== key) {
      continue;
    }
    n += 1;
    if (t.kind === "income") {
      inc += t.amount;
    } else {
      exp += t.amount;
    }
  }
  return { exp, inc, n };
};

export const keyOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** average of the previous three months that actually had spending */
export const usualSpend = (txns: Txn[], now: Date): number => {
  let total = 0;
  let months = 0;
  for (let i = 1; i <= 3; i += 1) {
    const key = keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const spent = sumIn(txns, key).exp;
    if (spent > 0) {
      total += spent;
      months += 1;
    }
  }
  return months ? total / months : 0;
};

export const topCategory = (
  txns: Txn[],
  key: string
): { amount: number; name: string } | null => {
  const byCat = new Map<string, number>();
  for (const t of txns) {
    if (t.kind === "expense" && monthKey(t.date) === key) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    }
  }
  const sorted = [...byCat.entries()].toSorted((a, b) => b[1] - a[1]);
  const [top] = sorted;
  return top ? { amount: top[1], name: top[0] } : null;
};

export const nextBillLine = (
  recurrings: Recurring[],
  today: string,
  currency: string
): string => {
  const active = recurrings
    .filter((r) => r.active)
    .toSorted((a, b) => (a.nextDue < b.nextDue ? -1 : 1));
  const [next] = active;
  if (!next) {
    return "";
  }
  const days = diffDays(next.nextDue, today);
  if (days < 0) {
    return `${next.title} is ${Math.abs(days)} days past its date.`;
  }
  if (days === 0) {
    return `${next.title} is due today.`;
  }
  return `${next.title} (${money(next.amount, currency)}) lands ${prettyDate(next.nextDue)}.`;
};

export const paceLine = (
  exp: number,
  usual: number,
  currency: string
): string => {
  if (usual <= 0 || exp <= 0) {
    return "";
  }
  const pct = Math.round(((exp - usual) / usual) * 100);
  const gap = money(Math.abs(exp - usual), currency);
  if (pct >= 12) {
    return `That's about ${pct}% above your usual pace - roughly ${gap} more than a typical month.`;
  }
  if (pct <= -12) {
    return `That's about ${Math.abs(pct)}% below your usual pace - ${gap} lighter than a typical month.`;
  }
  return "That's right in line with your usual pace.";
};

export const cardLine = (ctx: InsightCtx): string => {
  const { txns, settings, now } = ctx;
  const thisMonth = cardSpendIn(txns, monthKey(isoDay(now)));
  const { amount, key } = lastStatement(txns, now);
  if (findCardBill(ctx.recurrings) && amount > 0) {
    return `Your ${statementLabel(key)} card statement is ${money(amount, settings.currency)}.`;
  }
  if (thisMonth > 0) {
    return `${money(thisMonth, settings.currency)} of this month rode on the card - I'll flag the statement when it lands.`;
  }
  return "";
};

export const looseEnds = (ctx: InsightCtx): string => {
  const today = isoDay(ctx.now);
  const watch = ctx.promises.filter((p) => p.due && p.due <= today).length;
  const overdue = ctx.recurrings.filter((r) =>
    isOverdue(r, today, ctx.txns)
  ).length;
  const parts: string[] = [];
  if (overdue > 0) {
    parts.push(
      `${overdue} bill${overdue > 1 ? "s" : ""} slipped past its date`
    );
  }
  if (watch > 0) {
    parts.push(`${watch} expected payment${watch > 1 ? "s" : ""} to confirm`);
  }
  if (!parts.length) {
    return "Nothing is asking for you right now.";
  }
  return `Worth a moment: ${parts.join(", and ")}.`;
};
