import { addDays, diffDays, isoDay } from "./format";
import type { Insight, InsightCtx } from "./types";

export const addHabitInsights = ({
  txns,
  settings,
  now,
}: InsightCtx): Insight[] => {
  const out: Insight[] = [];
  const today = isoDay(now);
  const dayOfMonth = now.getDate();
  const dimNow = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (dayOfMonth >= dimNow - 3) {
    out.push({
      body: `Income, spending, and the shape of the month - summarized gently, without the spreadsheet stare.`,
      cta: "Read summary",
      go: "insights",
      id: "month-wrap",
      priority: 40,
      title: "Month in review is ready",
      tone: "calm",
      why: "A monthly glance catches drift that daily logging alone will not.",
    });
  }

  if (txns.length > 0 && txns.length < 8) {
    out.push({
      body: `A few more days of everyday entries and the observations get sharper. Recording takes seconds - that's the whole habit.`,
      cta: "Add an entry",
      go: "add-expense",
      id: "early",
      metric: `${txns.length} entries so far`,
      priority: 10,
      title: "Pebble is learning your rhythm",
      tone: "calm",
      why: "The more you log, the more specific I can be - right now I am still guessing.",
    });
  }

  const backupAge = settings.lastBackupAt
    ? diffDays(today, settings.lastBackupAt.slice(0, 10))
    : -1;
  if (backupAge > 30 || (!settings.lastBackupAt && txns.length > 15)) {
    out.push({
      body: settings.lastBackupAt
        ? `Your last file backup was over a month ago. One tap keeps a copy entirely in your hands.`
        : `You've built up real history. A one-tap backup file means it's yours forever - no account needed.`,
      cta: "Back up now",
      go: "care",
      id: "backup",
      metric: settings.lastBackupAt
        ? `backed up ${backupAge}d ago`
        : "never backed up",
      priority: 35,
      title: settings.lastBackupAt
        ? "A fresh backup would be wise"
        : "Keep a copy in your hands",
      tone: "nudge",
    });
  }

  let streak = 0;
  for (let i = 0; i < 30; i += 1) {
    const day = addDays(today, -i);
    if (txns.some((t) => t.date === day)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
  }
  if (streak >= 5) {
    out.push({
      body: `Small, steady attention - that's exactly how financial clarity is built. Lovely work.`,
      id: "streak",
      metric: `${streak} days`,
      priority: 12,
      title: `${streak}-day tracking streak`,
      tone: "celebrate",
      why: "Consistency beats precision - rough entries still build the picture.",
    });
  }
  return out;
};
