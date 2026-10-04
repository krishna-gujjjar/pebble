import { CreditCard, Info } from "lucide-react";

import { CARD, PAY_METHODS } from "../lib/card";

const PaymentPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (p: string) => void;
}) => (
  <div className="mt-3">
    <div className="flex flex-wrap gap-2">
      {PAY_METHODS.map((m) => {
        const active = value === m;
        return (
          <button
            type="button"
            key={m}
            onClick={() => onChange(m)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all ${active ? "bg-[#1e4d3a] text-white" : "bg-white text-[#3d4b42] ring-1 ring-[#1c2b23]/10"}`}
          >
            {m === CARD ? <CreditCard size={13} /> : null}
            {m}
          </button>
        );
      })}
    </div>
    {value === CARD ? (
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-[#5b6b60]">
        <Info size={13} className="mt-0.5 shrink-0 text-[#1e4d3a]" />
        Counted today, not when you pay the bill. Pebble settles card bills
        without logging the money twice.
      </p>
    ) : null}
  </div>
);

export default PaymentPicker;
