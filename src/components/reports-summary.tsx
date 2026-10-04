import { money } from "../lib/format";
import type { Totals } from "../lib/period";
import { Card } from "./ui";

const Stat = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: string;
}) => (
  <Card className="p-3.5 text-center">
    <p className="text-[12px] font-medium text-[#5b6b60]">{label}</p>
    <p className={`font-display mt-0.5 text-[17px] font-bold ${tone}`}>
      {value}
    </p>
  </Card>
);

const ReportsSummary = ({
  totals,
  currency,
}: {
  totals: Totals;
  currency: string;
}) => {
  const { card, exp, inc } = totals;
  const kept = inc - exp;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Came in"
          tone="text-[#1e4d3a]"
          value={money(inc, currency)}
        />
        <Stat
          label="Went out"
          tone="text-[#1c2b23]"
          value={money(exp, currency)}
        />
        <Stat
          label="Kept"
          tone={kept >= 0 ? "text-[#1e4d3a]" : "text-[#b3541e]"}
          value={money(kept, currency)}
        />
      </div>
      {card > 0 ? (
        <p className="px-1 text-[12px] text-[#8a978d]">
          {money(card, currency)} of that spending went on the card - counted
          once, in the month you swiped.
        </p>
      ) : null}
    </div>
  );
};

export default ReportsSummary;
