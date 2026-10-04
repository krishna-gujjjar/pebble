import { CalendarDays, Plus } from "lucide-react";

import { money, prettyDate } from "../lib/format";
import { Card } from "./ui";

const SalaryStrip = ({
  expected,
  salIn,
  daysToPay,
  pay,
  payday,
  currency,
  onLog,
}: {
  expected: number;
  salIn: boolean;
  daysToPay: number;
  pay: string;
  payday: number;
  currency: string;
  onLog: () => void;
}) => {
  if (expected <= 0) {
    return null;
  }
  let heading = "Salary window is here";
  if (salIn) {
    heading = "Salary received this month";
  } else if (daysToPay === 0) {
    heading = "Payday should be today";
  } else if (daysToPay > 0) {
    const plural = daysToPay === 1 ? "" : "s";
    heading = `Salary expected in ${daysToPay} day${plural} · ${prettyDate(pay)}`;
  }
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef5ec]">
        <CalendarDays size={19} className="text-[#1e4d3a]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#1c2b23]">{heading}</p>
        <p className="text-[12.5px] text-[#5b6b60]">
          Usually around {money(expected, currency)} · lands near the{" "}
          {payday || 1}st
        </p>
      </div>
      {salIn ? null : (
        <button
          type="button"
          onClick={onLog}
          className="shrink-0 rounded-full bg-[#1c2b23] px-3.5 py-2 text-[12.5px] font-semibold text-[#f7f4ec]"
        >
          <Plus size={13} className="inline" /> Log
        </button>
      )}
    </Card>
  );
};

export default SalaryStrip;
