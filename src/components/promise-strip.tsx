import { CheckCircle2, Clock3 } from "lucide-react";

import { money, prettyDate } from "../lib/format";
import { overdueDays } from "../lib/promises";
import type { IncomePromise } from "../lib/types";

const PromiseStrip = ({
  promises,
  currency,
  onSettle,
}: {
  promises: IncomePromise[];
  currency: string;
  onSettle: (uid: string) => void;
}) => {
  const list = [...promises].toSorted((a, b) =>
    (a.due || "9999").localeCompare(b.due || "9999")
  );
  if (list.length === 0) {
    return null;
  }
  return (
    <div className="rounded-3xl bg-[#eef5ec] p-4 ring-1 ring-[#1e4d3a]/15">
      <p className="font-display flex items-center gap-1.5 text-[15px] font-semibold text-[#1c2b23]">
        <Clock3 size={15} className="text-[#1e4d3a]" /> Expecting money
      </p>
      <div className="mt-2 space-y-2">
        {list.map((p) => {
          const days = overdueDays(p);
          let dueNote = "no date set yet";
          if (p.due) {
            dueNote =
              days <= 0
                ? `expected ${prettyDate(p.due)}`
                : `${days}d overdue · was ${prettyDate(p.due)}`;
          }
          return (
            <div
              key={p.uid}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-[#1e4d3a]/10"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-[#1c2b23]">
                  {p.note} · {money(p.expected, currency)}
                </p>
                <p className="text-[12px] text-[#5b6b60]">{dueNote}</p>
              </div>
              <button
                type="button"
                onClick={() => onSettle(p.uid)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1e4d3a] px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                <CheckCircle2 size={12} /> Received
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PromiseStrip;
