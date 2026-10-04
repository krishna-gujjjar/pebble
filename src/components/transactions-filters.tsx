import { Search } from "lucide-react";

import { Card, Pill } from "./ui";

const TransactionsFilters = ({
  q,
  onQ,
  filter,
  onFilter,
  cat,
  onCat,
  cats,
}: {
  q: string;
  onQ: (v: string) => void;
  filter: "all" | "expense" | "income";
  onFilter: (f: "all" | "expense" | "income") => void;
  cat: string;
  onCat: (c: string) => void;
  cats: string[];
}) => (
  <Card className="space-y-3 p-4">
    <div className="flex items-center gap-2 rounded-2xl bg-[#f6f2e8] px-3.5 py-2.5 ring-1 ring-[#1c2b23]/8">
      <Search size={16} className="shrink-0 text-[#8a978d]" />
      <input
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder="Search notes, categories, amounts…"
        className="w-full bg-transparent text-[14.5px] text-[#1c2b23] outline-none placeholder:text-[#9aa79d]"
      />
    </div>
    <div className="flex gap-2 overflow-x-auto pb-0.5">
      <Pill active={filter === "all"} onClick={() => onFilter("all")}>
        Everything
      </Pill>
      <Pill active={filter === "expense"} onClick={() => onFilter("expense")}>
        Spending
      </Pill>
      <Pill active={filter === "income"} onClick={() => onFilter("income")}>
        Income
      </Pill>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-0.5">
      {cats.map((c) => (
        <Pill key={c} active={cat === c} onClick={() => onCat(c)}>
          {c}
        </Pill>
      ))}
    </div>
  </Card>
);

export default TransactionsFilters;
