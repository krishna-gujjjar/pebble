import { Sparkles } from "lucide-react";
import { AnimatePresence } from "motion/react";

import type { Insight } from "../lib/types";
import InsightCard from "./insight-card";
import { Card } from "./ui";

const NotesFeed = ({
  items,
  unread,
  onDismiss,
  onGo,
  onSnooze,
}: {
  items: Insight[];
  unread: number;
  onDismiss: (id: string) => void;
  onGo: (go: string) => void;
  onSnooze: () => void;
}) => (
  <div>
    <div className="mb-2.5 flex items-center justify-between px-1">
      <p className="font-display flex items-center gap-1.5 text-[17px] font-semibold text-[#1c2b23]">
        <Sparkles size={16} className="text-[#b97f1f]" /> What Pebble noticed
      </p>
      {unread > 3 ? (
        <button
          type="button"
          onClick={onSnooze}
          className="text-[12.5px] font-medium text-[#8a978d]"
        >
          Quiet for now
        </button>
      ) : null}
    </div>
    {items.length === 0 ? (
      <Card className="p-5 text-center">
        <p className="font-display text-[15px] font-semibold text-[#1c2b23]">
          All quiet - in a good way.
        </p>
        <p className="mx-auto mt-1 max-w-[280px] text-[13px] text-[#5b6b60]">
          Nothing needs your attention right now. Keep living; I&apos;ll tap you
          gently when something matters.
        </p>
      </Card>
    ) : (
      <div className="space-y-2.5">
        <AnimatePresence>
          {items.map((ins, i) => (
            <InsightCard
              key={ins.id}
              insight={ins}
              onGo={onGo}
              onDismiss={onDismiss}
              index={i}
            />
          ))}
        </AnimatePresence>
        {unread > 3 ? (
          <button
            type="button"
            onClick={() => onGo("insights")}
            className="w-full rounded-2xl bg-white py-2.5 text-[13px] font-semibold text-[#1c2b23] ring-1 ring-[#1c2b23]/10"
          >
            + {unread - 3} more observations
          </button>
        ) : null}
      </div>
    )}
  </div>
);

export default NotesFeed;
