import { isoDay, money, monthKey } from "./format";
import type { Insight, InsightCtx } from "./types";

export const addBudgetInsights = ({
  txns,
  settings,
  now,
}: InsightCtx): Insight[] => {
  const out: Insight[] = [];
  const mk = monthKey(isoDay(now));
  const thisMonth = txns.filter((t) => monthKey(t.date) === mk);
  for (const [cat, limit] of Object.entries(settings.budgets || {})) {
    if (!limit || limit <= 0) {
      continue;
    }
    const spent = thisMonth
      .filter((t) => t.kind === "expense" && t.category === cat)
      .reduce((s, t) => s + t.amount, 0);
    const pct = spent / limit;
    if (pct >= 1) {
      out.push({
        body: `You've used the full amount you set for ${cat}. Not a failure - just information for the rest of the month.`,
        cta: "Adjust budget",
        go: "care",
        id: `bud-${cat}`,
        metric: `${money(spent, settings.currency)} / ${money(limit, settings.currency)}`,
        priority: 88,
        title: `${cat} budget reached`,
        tone: "watch",
        why: "A budget you set yourself - the number is information, not a scolding.",
      });
    } else if (pct >= 0.8) {
      out.push({
        body: `A soft tap on the shoulder - a little room left, worth spending thoughtfully.`,
        cta: "View budget",
        go: "care",
        id: `bud-${cat}`,
        metric: `${Math.round(pct * 100)}% used`,
        priority: 60,
        title: `${cat} is at ${Math.round(pct * 100)}% of budget`,
        tone: "nudge",
        why: "Hearing this at 80% is far more useful than at 120%.",
      });
    }
  }
  return out;
};
