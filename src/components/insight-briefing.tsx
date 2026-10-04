import { Lock, Sparkles } from "lucide-react";
import { div as MotionDiv } from "motion/react-m";

import type { Briefing } from "../lib/insights-briefing";

/**
 * Pebble's opening note: the facts, in sentences, before the list of cards.
 * Composed from the user's own entries on the device - nothing is sent anywhere.
 */
const InsightBriefing = ({ briefing }: { briefing: Briefing }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="rounded-3xl bg-[#1c2b23] p-5 shadow-[0_18px_40px_-24px_rgba(28,43,35,0.7)]"
  >
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7f4ec]/12">
        <Sparkles size={16} className="text-[#f7f4ec]" />
      </span>
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-[#f7f4ec]">Pebble</p>
        <p className="text-[12px] text-[#f7f4ec]/60">
          briefed you · {briefing.updated}
        </p>
      </div>
    </div>

    <p className="font-display mt-4 text-[19px] leading-snug font-bold text-[#f7f4ec]">
      {briefing.greeting}
    </p>
    <p className="mt-1.5 text-[14px] leading-relaxed text-[#f7f4ec]/85">
      {briefing.narrative}
    </p>

    {briefing.facts.length > 0 ? (
      <div className="mt-4 flex flex-wrap gap-2">
        {briefing.facts.map((f) => (
          <span
            key={f.label}
            className="rounded-2xl bg-[#f7f4ec]/10 px-3 py-2 text-[12px] text-[#f7f4ec]/70"
          >
            {f.label}
            <span className="font-display ml-1.5 text-[13.5px] font-bold text-[#f7f4ec]">
              {f.value}
            </span>
          </span>
        ))}
      </div>
    ) : null}

    <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[#f7f4ec]/50">
      <Lock size={12} className="shrink-0" />
      Read from {briefing.reviewed} entries across {briefing.span} - on this
      device only.
    </p>
  </MotionDiv>
);

export default InsightBriefing;
