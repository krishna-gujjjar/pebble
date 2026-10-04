import type { ReactNode } from "react";

const AmountField = ({
  amount,
  onAmount,
  currency,
  hint,
  onEnter,
}: {
  amount: string;
  onAmount: (v: string) => void;
  currency: string;
  hint?: ReactNode;
  onEnter: () => void;
}) => (
  <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-[#1c2b23]/10">
    <label
      htmlFor="amount-field"
      className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase"
    >
      Amount
    </label>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="font-display text-[26px] text-[#8a978d]">
        {currency}
      </span>
      <input
        id="amount-field"
        value={amount}
        onChange={(e) => onAmount(e.target.value)}
        inputMode="decimal"
        placeholder="0"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onEnter();
          }
        }}
        className="font-display w-full bg-transparent text-[44px] font-bold text-[#1c2b23] outline-none placeholder:text-[#1c2b23]/20"
      />
    </div>
    {hint}
  </div>
);

export default AmountField;
