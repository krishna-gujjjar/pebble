import { ArrowDownLeft, ArrowUpRight, HandCoins, Wallet } from "lucide-react";

import { money } from "../lib/format";
import { Card } from "./ui";

const daysToPayLabel = (d: number): string => (d === 0 ? "today" : `in ${d}d`);

const DashboardHero = ({
  left,
  inc,
  exp,
  expected,
  daysToPay,
  salIn,
  currency,
  monthName,
  onQuick,
}: {
  left: number;
  inc: number;
  exp: number;
  expected: number;
  daysToPay: number;
  salIn: boolean;
  currency: string;
  monthName: string;
  onQuick: (k: "expense" | "income" | "lend") => void;
}) => {
  const paydayNote =
    expected > 0 && !salIn ? ` · payday ${daysToPayLabel(daysToPay)}` : "";
  return (
    <Card dark className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#1e4d3a]/60 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#c9a227]/15 blur-2xl" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#f7f4ec]/70">
          <Wallet size={13} /> This month · {monthName}
        </p>
        <p className="font-display mt-1 text-[40px] leading-none font-bold text-[#f7f4ec] sm:text-[46px]">
          {money(left, currency)}
        </p>
        <p className="mt-1.5 text-[13px] text-[#f7f4ec]/65">
          {money(inc, currency)} in · {money(exp, currency)} out
          {paydayNote}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onQuick("expense")}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f7f4ec] py-3 text-[13.5px] font-bold text-[#1c2b23] transition-transform active:scale-95"
          >
            <ArrowUpRight size={15} /> Spend
          </button>
          <button
            type="button"
            onClick={() => onQuick("income")}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f7f4ec]/15 py-3 text-[13.5px] font-semibold text-[#f7f4ec] ring-1 ring-[#f7f4ec]/25 transition-transform active:scale-95"
          >
            <ArrowDownLeft size={15} /> Earn
          </button>
          <button
            type="button"
            onClick={() => onQuick("lend")}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#f7f4ec]/15 py-3 text-[13.5px] font-semibold text-[#f7f4ec] ring-1 ring-[#f7f4ec]/25 transition-transform active:scale-95"
          >
            <HandCoins size={15} /> Lend
          </button>
        </div>
      </div>
    </Card>
  );
};

export default DashboardHero;
