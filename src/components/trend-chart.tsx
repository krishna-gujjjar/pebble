import { money, monthLabel } from "../lib/format";
import { Card } from "./ui";

const TrendChart = ({
  trend,
  currency,
}: {
  trend: { key: string; inc: number; exp: number }[];
  currency: string;
}) => {
  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.inc, t.exp)));
  return (
    <Card className="p-5">
      <p className="font-display text-[15.5px] font-semibold text-[#1c2b23]">
        Six-month rhythm
      </p>
      <p className="text-[12.5px] text-[#5b6b60]">
        Green is income, sand is spending.
      </p>
      <div className="mt-4 flex h-36 items-end gap-2.5">
        {trend.map((t) => (
          <div
            key={t.key}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span className="sr-only">
              {monthLabel(t.key)}: income {money(t.inc, currency)}, spending{" "}
              {money(t.exp, currency)}
            </span>
            <div
              aria-hidden="true"
              className="flex h-28 w-full items-end justify-center gap-1"
            >
              <div
                className="w-full max-w-[22px] rounded-t-md bg-[#1e4d3a]/85"
                style={{ height: `${Math.max(3, (t.inc / maxTrend) * 100)}%` }}
              />
              <div
                className="w-full max-w-[22px] rounded-t-md bg-[#ddd2b4]"
                style={{ height: `${Math.max(3, (t.exp / maxTrend) * 100)}%` }}
              />
            </div>
            <span
              aria-hidden="true"
              className="text-[12px] font-medium text-[#8a978d]"
            >
              {monthLabel(t.key).split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TrendChart;
