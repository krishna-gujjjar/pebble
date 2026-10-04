import { diffDays, isoDay, money } from "./format";
import { isDueSoon, isOverdue } from "./recurring";
import type { Insight, InsightCtx } from "./types";

export const addPlannerInsights = ({
  loans,
  recurrings,
  settings,
  now,
  txns,
}: InsightCtx): Insight[] => {
  const out: Insight[] = [];
  const today = isoDay(now);
  const active = recurrings.filter((r) => r.active);
  const overdue = active.filter((r) => isOverdue(r, today, txns));
  const soon = active.filter((r) => isDueSoon(r, today, txns));
  if (overdue.length) {
    out.push({
      body: `These slipped past their expected date. A quick check avoids late fees - that's all this is.`,
      cta: "Review bills",
      go: "recurring",
      id: "rec-over",
      metric: `${overdue.length} past due`,
      priority: 95,
      title: `${overdue.length} bill${overdue.length > 1 ? "s" : ""} may need attention`,
      tone: "watch",
      why: "Late fees cost more than the two minutes it takes to check.",
    });
  } else if (soon.length) {
    out.push({
      body: `Nothing due right this second - just so they don't surprise you later.`,
      cta: "See schedule",
      go: "recurring",
      id: "rec-soon",
      metric: `${soon.length} this week`,
      priority: 55,
      title: `${soon.length} upcoming bill${soon.length > 1 ? "s" : ""} this week`,
      tone: "calm",
      why: "Bills are calmer when you meet them before the date, not after.",
    });
  }
  if (active.length >= 3) {
    out.push({
      body: `Your recurring commitments hum along each month. Worth a calm review once a season.`,
      cta: "Audit recurrings",
      go: "recurring",
      id: "rec-sum",
      metric: `${active.length} recurring`,
      priority: 15,
      title: "Subscriptions quietly add up",
      tone: "calm",
      why: "Recurring costs are the ones nobody notices - until they are cancelled.",
    });
  }

  const openLent = loans.filter(
    (l) => l.status === "open" && l.direction === "lent"
  );
  const openBor = loans.filter(
    (l) => l.status === "open" && l.direction === "borrowed"
  );
  const owed = openLent.reduce((s, l) => s + (l.amount - l.repaid), 0);
  const owe = openBor.reduce((s, l) => s + (l.amount - l.repaid), 0);
  if (owed > 0) {
    out.push({
      body: `A little is still out with friends. Pebble remembers so you don't have to carry it in your head.`,
      cta: "View lending",
      go: "lending",
      id: "lend-out",
      metric: `${money(owed, settings.currency)} out`,
      priority: 50,
      title: "You're owed - no awkwardness needed",
      tone: "calm",
      why: "Money outside your account is worth remembering when you plan.",
    });
  }
  if (owe > 0) {
    out.push({
      body: `Clearing it when you can keeps things light between people. Pebble will stop mentioning it once it's settled.`,
      cta: "View lending",
      go: "lending",
      id: "lend-in",
      metric: `${money(owe, settings.currency)} to return`,
      priority: 52,
      title: "A small balance to return",
      tone: "calm",
      why: "Settling small balances keeps relationships easy.",
    });
  }
  const stale = openLent.find((l) => diffDays(today, l.date) > 30);
  if (stale) {
    out.push({
      body: `Over a month now. A friendly reminder is perfectly okay - most people simply forget.`,
      cta: "Nudge gently",
      go: "lending",
      id: "lend-stale",
      metric: `${diffDays(today, stale.date)} days open`,
      priority: 65,
      title: `A loan to ${stale.person} has been open a while`,
      tone: "nudge",
      why: "Most people simply forgot - a short reminder is kinder than silence.",
    });
  }
  return out;
};
