import { diffDays, isoDay, median, money, monthKey } from "./format";
import type { Insight, InsightCtx, Txn } from "./types";

const expenseTotal = (txns: Txn[], key: string): number => {
  let total = 0;
  for (const t of txns) {
    if (monthKey(t.date) === key && t.kind === "expense") {
      total += t.amount;
    }
  }
  return total;
};

const unusualSpend = (
  txns: Txn[],
  sorted: Txn[],
  today: string,
  currency: string
): Insight | null => {
  const recent = sorted.slice(0, 40).filter((t) => t.kind === "expense");
  for (const t of recent.slice(0, 12)) {
    const peers = txns.flatMap((x) =>
      x.kind === "expense" && x.category === t.category && x.uid !== t.uid
        ? [x.amount]
        : []
    );
    const med = median(peers);
    if (
      med > 0 &&
      t.amount >= med * 2.5 &&
      t.amount - med >= 40 &&
      diffDays(today, t.date) <= 21
    ) {
      return {
        body: `Something in ${t.category} was notably larger than your usual - worth a second glance, just in case it needs splitting or checking.`,
        cta: "View transactions",
        go: "transactions",
        id: `unusual-${t.uid}`,
        metric: `${money(t.amount, currency)} on ${t.category}`,
        priority: 75,
        title: "One purchase stood out",
        tone: "nudge",
        why: "Worth a glance while you still remember it - that is all this is.",
      };
    }
  }
  return null;
};

const topCategory = (thisMonth: Txn[]): [string, number] | null => {
  const byCat = new Map<string, number>();
  for (const t of thisMonth) {
    if (t.kind !== "expense") {
      continue;
    }
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  }
  const [top] = [...byCat.entries()].toSorted((a, b) => b[1] - a[1]);
  return top && top[1] > 0 ? top : null;
};

export const addSpendingInsights = ({
  settings,
  txns,
  now,
}: InsightCtx): Insight[] => {
  const out: Insight[] = [];
  const today = isoDay(now);
  const mk = monthKey(today);
  const sorted = [...txns].toSorted((a, b) => (a.date < b.date ? 1 : -1));
  const thisMonth = txns.filter((t) => monthKey(t.date) === mk);
  const expThis = thisMonth
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const incThis = thisMonth
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount, 0);

  const prevKeys: string[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    prevKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  const prevTotals = prevKeys.flatMap((k) => {
    const total = expenseTotal(txns, k);
    return total > 0 ? [total] : [];
  });
  const baseline = prevTotals.length
    ? prevTotals.reduce((a, b) => a + b, 0) / prevTotals.length
    : 0;

  if (baseline > 0 && expThis > 0) {
    const pct = Math.round(((expThis - baseline) / baseline) * 100);
    if (pct >= 25) {
      out.push({
        body: `You've spent more than your recent monthly rhythm. No judgment - months vary. A quick look at the biggest categories usually explains it.`,
        cta: "See breakdown",
        go: "reports",
        id: "spend-up",
        metric: `+${pct}% vs usual`,
        priority: 90,
        title: `Spending is up ${pct}% vs your usual`,
        tone: "nudge",
        why: "Seeing it early is what makes it fixable - later is when it feels like a problem.",
      });
    } else if (pct <= -20) {
      out.push({
        body: `Spending is comfortably below your usual pace. Whatever you're doing, it's working quietly in the background.`,
        cta: "See reports",
        go: "reports",
        id: "spend-calm",
        metric: `−${Math.abs(pct)}% vs usual`,
        priority: 30,
        title: `A calmer month - down ${Math.abs(pct)}%`,
        tone: "celebrate",
        why: "Under your own pace, not someone else’s - that is the only comparison that matters.",
      });
    }
  }

  const dayOfMonth = now.getDate();
  const dimNow = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (dayOfMonth >= 4 && expThis > 0 && baseline > 0) {
    const projected = (expThis / dayOfMonth) * dimNow;
    if (projected > baseline * 1.2) {
      out.push({
        body: `At this rhythm you'd end the month a touch above usual. Small choices now matter more than big fixes later.`,
        cta: "Review spending",
        go: "transactions",
        id: "pace",
        metric: `about ${money(projected, settings.currency)} by month-end`,
        priority: 70,
        title: "Gentle pace check",
        tone: "nudge",
        why: "A projection is a nudge, not a verdict - the rest of the month is still yours.",
      });
    }
  }

  if (incThis > 0) {
    const rate = Math.round(((incThis - expThis) / incThis) * 100);
    if (rate >= 20) {
      out.push({
        body: `You're keeping a healthy slice of what came in. That's the whole game, played well.`,
        id: "save-good",
        metric: `${rate}% kept`,
        priority: 25,
        title: `${rate}% saved so far - genuinely good`,
        tone: "celebrate",
        why: "Keeping a slice is the whole game, and you are playing it quietly well.",
      });
    } else if (rate < 0) {
      out.push({
        body: `It happens - uneven months are normal. If it keeps happening, Pebble will notice the pattern before it becomes a problem.`,
        cta: "Look closer",
        go: "reports",
        id: "save-neg",
        metric: `${money(expThis - incThis, settings.currency)} past income`,
        priority: 85,
        title: "Spending has passed income this month",
        tone: "watch",
        why: "Months run uneven. The value here is noticing early, not judging.",
      });
    }
  }

  const spike = unusualSpend(txns, sorted, today, settings.currency);
  if (spike) {
    out.push(spike);
  }

  const top = topCategory(thisMonth);
  if (top) {
    out.push({
      body: `That's simply where life happened most. If it surprises you, budgets can quietly watch it next month.`,
      cta: "Set a budget",
      go: "care",
      id: "topcat",
      metric: `${money(top[1], settings.currency)}`,
      priority: 20,
      title: `${top[0]} leads this month`,
      tone: "calm",
      why: "Your biggest category is usually where life happened, not where you failed.",
    });
  }
  return out;
};
