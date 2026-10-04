import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { money, prettyDate } from "../lib/format";
import type { Txn } from "../lib/types";
import { Card } from "./ui";

const RecentList = ({
  recent,
  currency,
  onSeeAll,
}: {
  recent: Txn[];
  currency: string;
  onSeeAll: () => void;
}) => (
  <div>
    <div className="mb-2.5 flex items-center justify-between px-1">
      <p className="font-display text-[17px] font-semibold text-[#1c2b23]">
        Recent
      </p>
      <button
        type="button"
        onClick={onSeeAll}
        className="text-[13px] font-semibold text-[#1e4d3a]"
      >
        See all
      </button>
    </div>
    {recent.length === 0 ? (
      <Card className="p-5 text-center">
        <p className="text-[13.5px] text-[#5b6b60]">
          Nothing yet. Your first entry takes seconds - tap Spend above.
        </p>
      </Card>
    ) : (
      <Card className="divide-y divide-[#1c2b23]/5 overflow-hidden">
        {recent.map((t) => (
          <div key={t.uid} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.kind === "income" ? "bg-[#eef5ec] text-[#1e4d3a]" : "bg-[#f6f2e8] text-[#5b6b60]"}`}
            >
              {t.kind === "income" ? (
                <ArrowDownLeft size={15} />
              ) : (
                <ArrowUpRight size={15} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[#1c2b23]">
                {t.note || t.category}
              </p>
              <p className="text-[12px] text-[#8a978d]">{prettyDate(t.date)}</p>
            </div>
            <p
              className={`font-display text-[15px] font-bold ${t.kind === "income" ? "text-[#1e4d3a]" : "text-[#1c2b23]"}`}
            >
              {t.kind === "income" ? "+" : "−"}
              {money(t.amount, currency).replace("−", "")}
            </p>
          </div>
        ))}
      </Card>
    )}
  </div>
);

export default RecentList;
