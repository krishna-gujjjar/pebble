import {
  cardBillDayThisMonth,
  cardBillDue,
  cardSpendIn,
  cardSpendSince,
  findCardBill,
  lastStatement,
  statementLabel,
} from "./card";
import { diffDays, isoDay, money, monthKey, prettyDate } from "./format";
import { cardBillGo } from "./go-actions";
import { isOverdue } from "./recurring";
import type { Insight, InsightCtx, Txn } from "./types";

const spentIn = (txns: Txn[], key: string): number => {
  let total = 0;
  for (const t of txns) {
    if (t.kind === "expense" && !t.loanUid && monthKey(t.date) === key) {
      total += t.amount;
    }
  }
  return total;
};

const monthKeyOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** the statement you'll be asked to pay, and whether Pebble is already watching it */
const statementInsight = (
  ctx: InsightCtx,
  bill: ReturnType<typeof findCardBill>
): Insight | null => {
  const { txns, settings, now } = ctx;
  const { amount, key } = lastStatement(txns, now);
  if (amount <= 0) {
    return null;
  }
  const amt = money(amount, settings.currency);
  const period = statementLabel(key);
  const wasDue = cardBillDayThisMonth(now);
  const passed = wasDue < isoDay(now);
  // the reminder that is still useful: the next bill day ahead of us
  const due = cardBillDue(now);
  if (!bill) {
    return {
      body: passed
        ? `Your ${period} card statement was about ${amt}, due ${prettyDate(wasDue)} - settle it whenever, and I'll keep an eye on the next one. Paying the card never logs spending; those purchases were already counted in ${period}.`
        : `You put ${amt} on the card in ${period}. Want me to keep the due date in view? Paying it later won't be logged as spending - those purchases were already counted the month you made them.`,
      cta: "Watch the card bill",
      go: cardBillGo(amount, due),
      id: "card-track",
      metric: passed
        ? `${amt} · was due ${prettyDate(wasDue)}`
        : `${amt} · due ${prettyDate(due)}`,
      priority: passed ? 72 : 78,
      title: `Card statement for ${period}: ${amt}`,
      tone: passed ? "nudge" : "calm",
      why: "One reminder, and no double-counting when you settle it.",
    };
  }
  const overdue = isOverdue(bill, isoDay(now), ctx.txns);
  const days = diffDays(isoDay(now), bill.nextDue);
  return {
    body: overdue
      ? `${amt} was expected from your ${period} card statement. Mark it paid in Bills - Pebble logs no spending for it, since that money already counts in ${period}.`
      : `Your ${period} statement is about ${amt}, due ${prettyDate(bill.nextDue)}. Paying it here won't add a spending entry - it settles what you already counted.`,
    cta: "Open card bill",
    go: "recurring",
    id: "card-due",
    metric: overdue
      ? `${Math.abs(days)}d overdue · ${amt}`
      : `${amt} · due ${prettyDate(bill.nextDue)}`,
    priority: overdue ? 92 : 68,
    title: overdue ? "Card bill is past its date" : "Card bill is coming up",
    tone: overdue ? "watch" : "nudge",
    why: "Card money leaves later, but it was spent the day you swiped.",
  };
};

/** how much of this month's spending rode on the card, versus last month */
const shareInsight = (ctx: InsightCtx): Insight | null => {
  const { txns, now } = ctx;
  const thisKey = monthKey(isoDay(now));
  const prevKey = monthKeyOf(
    new Date(now.getFullYear(), now.getMonth() - 1, 1)
  );
  const thisAll = spentIn(txns, thisKey);
  const prevAll = spentIn(txns, prevKey);
  if (thisAll <= 0 || prevAll <= 0) {
    return null;
  }
  const nowShare = Math.round((cardSpendIn(txns, thisKey) / thisAll) * 100);
  const wasShare = Math.round((cardSpendIn(txns, prevKey) / prevAll) * 100);
  if (nowShare - wasShare < 15 || nowShare < 30) {
    return null;
  }
  return {
    body: `Card is carrying ${nowShare}% of this month's spending, up from ${wasShare}% last month. Nothing wrong with that - just worth knowing before the statement lands.`,
    cta: "See this month",
    go: "reports",
    id: "card-share",
    metric: `${nowShare}% on card`,
    priority: 58,
    title: "More of your spending moved to the card",
    tone: "nudge",
    why: "Card spending feels lighter than cash, but it lands just the same.",
  };
};

/** a quiet card with nothing new on it - no nagging, just a door to close */
const idleInsight = (
  ctx: InsightCtx,
  bill: ReturnType<typeof findCardBill>
): Insight | null => {
  if (!bill || !bill.lastPaid) {
    return null;
  }
  const { txns, now } = ctx;
  if (cardSpendSince(txns, bill.lastPaid) > 0) {
    return null;
  }
  if (diffDays(isoDay(now), bill.lastPaid) < 20) {
    return null;
  }
  return {
    body: `No new card spending since you settled the last one, so there's nothing to pay right now. If the card stays quiet, you can pause this reminder and I'll stop mentioning it.`,
    cta: "Manage in Bills",
    go: "recurring",
    id: "card-idle",
    priority: 20,
    title: "Card is quiet - nothing to settle",
    tone: "calm",
    why: "A paused reminder is better than a stale one.",
  };
};

export const addCardInsights = (ctx: InsightCtx): Insight[] => {
  const bill = findCardBill(ctx.recurrings);
  const out: Insight[] = [];
  const statement = statementInsight(ctx, bill);
  if (statement) {
    out.push(statement);
  }
  const idle = idleInsight(ctx, bill);
  if (idle) {
    out.push(idle);
  }
  const share = shareInsight(ctx);
  if (share) {
    out.push(share);
  }
  return out;
};
