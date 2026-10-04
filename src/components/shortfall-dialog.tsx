import { HelpCircle, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { div as MotionDiv } from "motion/react-m";
import { useState } from "react";

import type { Shortfall } from "../hooks/use-finance";
import { isoDay, money, parseAmount } from "../lib/format";

const todayIso = isoDay(new Date());

interface ShortfallDraft {
  due?: string;
  total?: string;
}

const ShortfallSheet = ({
  shortfall,
  currency,
  onLater,
  onNoMore,
  onClose,
}: {
  shortfall: Shortfall;
  currency: string;
  onLater: (total: number, due: string) => void;
  onNoMore: () => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState<ShortfallDraft>({});
  const [error, setError] = useState("");
  const total = draft.total ?? String(shortfall.expected);
  const due = draft.due ?? "";
  const diff = shortfall.expected - shortfall.entry.amount;
  const amt = money(shortfall.entry.amount, currency);

  const later = () => {
    const v = parseAmount(total);
    if (!v || v <= shortfall.entry.amount) {
      setError(
        `The full amount should be more than ${money(shortfall.entry.amount, currency)}.`
      );
      return;
    }
    onLater(v, due);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <MotionDiv
        className="absolute inset-0 bg-[#1c2b23]/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <MotionDiv
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ damping: 24, stiffness: 300, type: "spring" }}
        className="relative m-4 w-full max-w-[440px] rounded-[28px] bg-[#faf7ef] p-5 text-left"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-white p-1.5 ring-1 ring-[#1c2b23]/10"
          aria-label="Close"
        >
          <X size={15} />
        </button>
        <p className="font-display text-[20px] font-bold text-[#1c2b23]">
          A little short of usual?
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#5b6b60]">
          You logged {amt} for{" "}
          <span className="font-semibold text-[#1c2b23]">
            {shortfall.entry.note || shortfall.entry.category}
          </span>
          . Your usual take-home is {money(shortfall.expected, currency)} -
          that&apos;s{" "}
          <span className="font-semibold text-[#b3541e]">
            {money(diff, currency)}
          </span>{" "}
          unaccounted for.
        </p>

        <div className="mt-4 space-y-2.5 rounded-2xl bg-white p-3.5 ring-1 ring-[#1c2b23]/10">
          <label
            htmlFor="sf-total"
            className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase"
          >
            Full amount expected
          </label>
          <input
            id="sf-total"
            value={total}
            onChange={(e) => setDraft((d) => ({ ...d, total: e.target.value }))}
            inputMode="decimal"
            placeholder="e.g. 50000"
            className="w-full rounded-xl bg-[#f6f2e8] px-3.5 py-2.5 text-[15px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
          />
          <label
            htmlFor="sf-due"
            className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase"
          >
            When should the rest arrive? (optional)
          </label>
          <input
            id="sf-due"
            type="date"
            value={due}
            min={todayIso}
            onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))}
            className="w-full rounded-xl bg-[#f6f2e8] px-3.5 py-2.5 text-[15px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
          />
          <p className="flex items-start gap-1.5 text-[12px] text-[#8a978d]">
            <HelpCircle size={13} className="mt-0.5 shrink-0" />
            Examples: salary top-up next Friday, or the rest of a project
            payment. Pebble reminds you when it&apos;s due.
          </p>
        </div>

        {error ? (
          <p className="mt-2.5 rounded-xl bg-[#fbeedf] px-3.5 py-2 text-[13px] text-[#8a4b12]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={later}
          className="mt-3.5 w-full rounded-2xl bg-[#1c2b23] py-3.5 text-[15px] font-semibold text-[#f7f4ec]"
        >
          Rest comes later - watch for it
        </button>
        <button
          type="button"
          onClick={onNoMore}
          className="mt-2 w-full rounded-2xl bg-white py-3 text-[14px] font-semibold text-[#1c2b23] ring-1 ring-[#1c2b23]/12"
        >
          That&apos;s all - leave / deduction
        </button>
      </MotionDiv>
    </div>
  );
};

const ShortfallDialog = ({
  shortfall,
  currency,
  onLater,
  onNoMore,
  onClose,
}: {
  shortfall: Shortfall | null;
  currency: string;
  onLater: (total: number, due: string) => void;
  onNoMore: () => void;
  onClose: () => void;
}) => (
  <AnimatePresence>
    {shortfall ? (
      <ShortfallSheet
        key={`${shortfall.entry.uid}-${shortfall.expected}`}
        shortfall={shortfall}
        currency={currency}
        onLater={onLater}
        onNoMore={onNoMore}
        onClose={onClose}
      />
    ) : null}
  </AnimatePresence>
);

export default ShortfallDialog;
