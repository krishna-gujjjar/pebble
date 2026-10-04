import { diffDays, isoDay, money, monthKey, prettyDate } from "./format";
import { nextPayday, salaryStats } from "./salary";
import type { Insight, InsightCtx } from "./types";

export const ym = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const paydayLabel = (daysToPay: number): string => {
  if (daysToPay === 0) {
    return "Payday is today";
  }
  const plural = daysToPay === 1 ? "" : "s";
  return `Payday in ${daysToPay} day${plural}`;
};

export const addSalaryInsights = ({
  txns,
  settings,
  now,
}: InsightCtx): Insight[] => {
  const out: Insight[] = [];
  const today = isoDay(now);
  const mk = monthKey(today);
  const sal = salaryStats(txns);
  const expected = settings.expectedSalary || sal.avg || 0;
  const pay = nextPayday(settings.payday || 1, now);
  const daysToPay = diffDays(pay, today);
  const salThisMonth = txns.some(
    (t) =>
      t.kind === "income" && t.category === "Salary" && monthKey(t.date) === mk
  );

  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dd = Math.min(Math.max(1, settings.payday || 1), dim);
  const lastPayday = ym(now.getFullYear(), now.getMonth() + 1, dd);
  const daysSincePayday = diffDays(today, lastPayday);

  if (salThisMonth) {
    out.push({
      body: `This month's pay has landed. No chasing, no guessing. Consider moving a little to savings while it feels easy.`,
      cta: "See monthly summary",
      go: "insights",
      id: "sal-done",
      metric: `${money(expected, settings.currency)} in`,
      priority: 8,
      title: "Salary is in - nice.",
      tone: "celebrate",
      why: "Payday is the easiest moment to set money aside - it hurts least right now.",
    });
  } else if (daysSincePayday >= 3 && expected > 0) {
    out.push({
      body: `Payday was around the ${settings.payday || 1}st and no salary is recorded yet. Sometimes payroll just runs slow - worth a gentle check with payroll if it hasn't landed.`,
      cta: "Record salary",
      go: "add-income",
      id: "sal-late",
      metric: `${daysSincePayday} days past payday`,
      priority: 100,
      title: `Salary looks ${daysSincePayday} days late`,
      tone: "watch",
      why: "Payroll delays are usually paperwork, but knowing early keeps your plan honest.",
    });
  } else if (daysToPay <= 7 && daysToPay >= 0 && expected > 0) {
    out.push({
      body: `Around payday is a good moment to glance at upcoming bills - nothing urgent, just a quiet heads-up.`,
      cta: "Review upcoming bills",
      go: "recurring",
      id: "sal-soon",
      metric: prettyDate(pay),
      priority: 80,
      title: paydayLabel(daysToPay),
      tone: "calm",
      why: "Seeing bills before payday beats meeting them after it.",
    });
  }
  return out;
};
