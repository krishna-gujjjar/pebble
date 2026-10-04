import { BellRing, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import type { Briefing } from "../lib/insights-briefing";
import { computeMilestones } from "../lib/milestones";
import type { Insight, Loan, Recurring, Settings, Txn } from "../lib/types";
import InsightBriefing from "./insight-briefing";
import InsightCard from "./insight-card";
import InsightPeriods from "./insight-periods";
import { Card, SectionTitle } from "./ui";

const SECTIONS = [
  {
    id: "now",
    sub: "Things that would rather not wait.",
    title: "Needs you now",
  },
  {
    id: "look",
    sub: "Not urgent - just worth knowing.",
    title: "Worth a look",
  },
  { id: "good", sub: "Small things going right.", title: "Going well" },
];

const sectionOf = (i: Insight): string => {
  if (i.tone === "watch" || i.priority >= 80) {
    return "now";
  }
  if (i.tone === "nudge") {
    return "look";
  }
  return "good";
};

const group = (items: Insight[]): Map<string, Insight[]> => {
  const map = new Map<string, Insight[]>();
  for (const i of items) {
    const key = sectionOf(i);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(i);
    } else {
      map.set(key, [i]);
    }
  }
  return map;
};

const InsightsView = ({
  insights,
  dismissed,
  txns,
  loans,
  recurrings,
  settings,
  briefing,
  onGo,
  onDismiss,
  onClearAll,
}: {
  insights: Insight[];
  dismissed: string[];
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  settings: Settings;
  briefing: Briefing;
  onGo: (go: string) => void;
  onDismiss: (id: string) => void;
  onClearAll: (ids: string[]) => void;
}) => {
  const [done, setDone] = useState(false);
  const dismissedSet = new Set(dismissed);
  const live = insights.filter((i) => !dismissedSet.has(i.id));
  const read = insights.filter((i) => dismissedSet.has(i.id));
  const buckets = group(live);
  const milestones = computeMilestones({ loans, recurrings, settings, txns });
  const unlocked = milestones.filter((m) => m.unlocked).length;

  const markAll = () => {
    onClearAll(insights.map((i) => i.id));
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };

  return (
    <div className="space-y-4">
      <InsightBriefing briefing={briefing} />

      <SectionTitle
        title="Observations"
        sub="Timed to what you actually logged - nothing generic."
        action={
          live.length > 0 ? (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1c2b23] ring-1 ring-[#1c2b23]/12"
            >
              <CheckCircle2 size={13} /> {done ? "All calm ✓" : "Mark all read"}
            </button>
          ) : undefined
        }
      />

      {live.length === 0 ? (
        <Card className="flex flex-col items-center p-8 text-center">
          <BellRing size={26} className="text-[#8a978d]" />
          <p className="font-display mt-3 text-[16px] font-semibold text-[#1c2b23]">
            You&apos;re all caught up
          </p>
          <p className="mt-1 max-w-[280px] text-[13.5px] text-[#5b6b60]">
            Pebble is still watching quietly in the background. New observations
            appear here the moment something matters.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {SECTIONS.map((s) => {
            const items = buckets.get(s.id) ?? [];
            if (items.length === 0) {
              return null;
            }
            return (
              <div key={s.id} className="space-y-2.5">
                <SectionTitle title={s.title} sub={s.sub} />
                {items.map((ins, i) => (
                  <InsightCard
                    key={ins.id}
                    insight={ins}
                    onGo={onGo}
                    onDismiss={onDismiss}
                    index={i}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <InsightPeriods txns={txns} settings={settings} />

      {read.length > 0 ? (
        <details className="rounded-3xl bg-white p-4 ring-1 ring-[#1c2b23]/10">
          <summary className="cursor-pointer text-[13.5px] font-semibold text-[#5b6b60]">
            Already read · {read.length}
          </summary>
          <div className="mt-3 space-y-2 opacity-60">
            {read.slice(0, 8).map((ins) => (
              <InsightCard key={ins.id} insight={ins} />
            ))}
          </div>
        </details>
      ) : null}

      <p className="px-1 text-[12px] text-[#8a978d]">
        {unlocked} milestones unlocked · observations refresh every time you
        open the app.
      </p>
    </div>
  );
};

export default InsightsView;
