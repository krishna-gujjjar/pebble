import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  Info,
  Sparkles,
} from "lucide-react";
import { div as MotionDiv } from "motion/react-m";

import type { Insight, Tone } from "../lib/types";

const TONE: Record<
  Tone,
  { bg: string; ring: string; dot: string; label: string }
> = {
  calm: {
    bg: "bg-[#f1eee2]",
    dot: "bg-[#8a978d]",
    label: "Noted",
    ring: "ring-[#1c2b23]/10",
  },
  celebrate: {
    bg: "bg-[#eef5ec]",
    dot: "bg-[#1e4d3a]",
    label: "Lovely",
    ring: "ring-[#1e4d3a]/15",
  },
  nudge: {
    bg: "bg-[#fbf3e3]",
    dot: "bg-[#b97f1f]",
    label: "Gentle nudge",
    ring: "ring-[#b97f1f]/20",
  },
  watch: {
    bg: "bg-[#fbeedd]",
    dot: "bg-[#b3541e]",
    label: "Worth a look",
    ring: "ring-[#b3541e]/20",
  },
};

const InsightCard = ({
  insight,
  onGo,
  onDismiss,
  index = 0,
}: {
  insight: Insight;
  onGo?: (go: string) => void;
  onDismiss?: (id: string) => void;
  index?: number;
}) => {
  const t = TONE[insight.tone];
  const onCta = () => {
    if (onGo && insight.go) {
      onGo(insight.go);
    }
  };
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.06, 0.3),
        duration: 0.4,
        ease: "easeOut",
      }}
      className={`rounded-3xl p-4 ring-1 ${t.bg} ${t.ring}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[#5b6b60] uppercase">
              {t.label}
            </p>
            {insight.metric ? (
              <span className="shrink-0 rounded-full bg-white/75 px-2.5 py-1 text-[12px] font-semibold text-[#1c2b23]">
                {insight.metric}
              </span>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={() => onDismiss(insight.id)}
                className="rounded-full p-1 text-[#8a978d] hover:bg-white/60 hover:text-[#1c2b23]"
                aria-label="Dismiss"
              >
                <CheckCircle2 size={15} />
              </button>
            ) : null}
          </div>
          <p className="font-display mt-0.5 text-[16px] leading-snug font-semibold text-[#1c2b23]">
            {insight.title}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#43544a]">
            {insight.body}
          </p>
          {insight.why ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-white/55 px-3 py-2 text-[12px] leading-relaxed text-[#5b6b60]">
              <Info size={13} className="mt-0.5 shrink-0 text-[#8a978d]" />
              {insight.why}
            </p>
          ) : null}
          {insight.cta && onGo && insight.go ? (
            <button
              type="button"
              onClick={onCta}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#f7f4ec] transition-transform active:scale-95"
            >
              {insight.cta} <ArrowRight size={13} />
            </button>
          ) : null}
        </div>
      </div>
    </MotionDiv>
  );
};

export default InsightCard;

export const InsightIcon = ({ tone }: { tone: Tone }) => {
  if (tone === "celebrate") {
    return <Sparkles size={15} className="text-[#1e4d3a]" />;
  }
  if (tone === "watch") {
    return <Bell size={15} className="text-[#b3541e]" />;
  }
  return <Eye size={15} className="text-[#5b6b60]" />;
};
