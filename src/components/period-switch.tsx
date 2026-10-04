import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Period } from "../lib/period";
import { PERIODS } from "../lib/period";

/** month / quarter / half-year / year, with arrows to walk back in time */
const PeriodSwitch = ({
  period,
  onPeriod,
  label,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  period: Period;
  onPeriod: (p: Period) => void;
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div className="space-y-2.5">
    <div className="flex flex-wrap gap-1.5 rounded-full bg-[#efe9d8] p-1.5">
      {PERIODS.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => onPeriod(p.id)}
          aria-pressed={period === p.id}
          className={`flex-1 rounded-full px-3 py-2 text-[12.5px] font-semibold whitespace-nowrap transition-all ${period === p.id ? "bg-white text-[#1c2b23] shadow-sm" : "text-[#5b6b60]"}`}
        >
          {p.label}
        </button>
      ))}
    </div>
    <div className="flex items-center justify-between rounded-full bg-white px-2 py-1.5 ring-1 ring-[#1c2b23]/10">
      <button
        type="button"
        onClick={() => canPrev && onPrev()}
        disabled={!canPrev}
        className="rounded-full p-1.5 disabled:opacity-30"
        aria-label="Previous period"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-[13.5px] font-semibold text-[#1c2b23]">
        {label}
      </span>
      <button
        type="button"
        onClick={() => canNext && onNext()}
        disabled={!canNext}
        className="rounded-full p-1.5 disabled:opacity-30"
        aria-label="Next period"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  </div>
);

export default PeriodSwitch;
