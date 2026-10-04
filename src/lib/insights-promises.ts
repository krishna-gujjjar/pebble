import { isoDay, money, prettyDate } from "./format";
import { overdueDays } from "./promises";
import type { Insight, InsightCtx } from "./types";

/** income the user said would arrive later (partial salary/deal) that is now due or overdue */
export const addPromiseInsights = ({
  promises,
  settings,
  now,
}: InsightCtx): Insight[] => {
  const today = isoDay(now);
  const out: Insight[] = [];
  for (const p of promises) {
    const days = overdueDays(p, today);
    if (days < 0) {
      // not due yet - shown quietly on Home instead
      continue;
    }
    const amt = money(p.expected, settings.currency);
    out.push({
      body:
        days === 0
          ? `Today was the day ${amt} for "${p.note}" was expected to land in full. Tap below once it has.`
          : `${amt} for "${p.note}" was expected ${prettyDate(p.due)} and isn't fully logged yet. A gentle ping, nothing more.`,
      cta: "Money received - clear this",
      go: `promise-settle:${p.uid}`,
      id: `pm-${p.uid}`,
      metric: `${amt} expected`,
      priority: 96,
      title:
        days === 0
          ? "Expected today - arrived?"
          : `${days}d overdue on expected income`,
      tone: "watch",
      why: "Money you are expecting is not money you have - this keeps the gap visible.",
    });
  }
  return out.toSorted((a, b) => b.priority - a.priority).slice(0, 3);
};
