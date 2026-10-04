import { ArrowDownLeft, ArrowUpRight, HandCoins } from "lucide-react";

import type { Kind } from "../lib/types";

const KINDS = [
  ["expense", "Expense", ArrowUpRight],
  ["income", "Income", ArrowDownLeft],
  ["lend", "Lend", HandCoins],
] as const;

const KindTabs = ({
  kind,
  onChange,
}: {
  kind: Kind | "lend";
  onChange: (k: Kind | "lend") => void;
}) => (
  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#efe9d8] p-1.5">
    {KINDS.map(([k, label, Icon]) => (
      <button
        type="button"
        key={k}
        onClick={() => onChange(k)}
        className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13.5px] font-semibold transition-all ${kind === k ? "bg-[#1c2b23] text-[#f7f4ec] shadow" : "text-[#5b6b60]"}`}
      >
        <Icon size={15} />
        {label}
      </button>
    ))}
  </div>
);

export default KindTabs;
