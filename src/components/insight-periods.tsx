import { useState } from "react";

import { useNow } from "../hooks/use-now";
import { money } from "../lib/format";
import type { Period } from "../lib/period";
import { rangeFor, rangeTxns, totalsFor } from "../lib/period";
import { salaryStats } from "../lib/salary";
import type { Settings, Txn } from "../lib/types";
import PeriodSwitch from "./period-switch";
import { Card, SectionTitle } from "./ui";

const wordsFor = (
  n: number,
  kept: number,
  inc: number,
  currency: string,
  isCurrent: boolean
): string => {
  if (n === 0) {
    return isCurrent
      ? "Nothing logged in this window yet."
      : "No entries in this window.";
  }
  if (inc <= 0) {
    return `${n} entries · ${money(kept, currency)} out, nothing recorded in.`;
  }
  const rate = Math.round((kept / inc) * 100);
  if (rate >= 20) {
    return `${n} entries · a steady stretch - you kept ${rate}% of what came in.`;
  }
  if (rate < 0) {
    return `${n} entries · spending ran ahead of income here, by ${money(Math.abs(kept), currency)}.`;
  }
  return `${n} entries · kept ${money(kept, currency)}, about ${rate}% of what came in.`;
};

/** the same numbers as the observations, over a wider window */
const InsightPeriods = ({
  txns,
  settings,
}: {
  txns: Txn[];
  settings: Settings;
}) => {
  const now = useNow();
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const ranges = [];
  for (let i = 0; i < 4; i += 1) {
    ranges.push(rangeFor(period, now, offset + i));
  }
  const rows = ranges.map((r) => ({
    key: r.from,
    label: r.label,
    range: r,
    totals: totalsFor(rangeTxns(txns, r), "Card"),
  }));
  const sal = salaryStats(txns);
  const prev = rangeFor(period, now, offset + 1);
  const oldest = txns.length
    ? txns.map((t) => t.date).toSorted()[0]
    : ranges[0].from;

  return (
    <>
      <SectionTitle
        title="Period summaries"
        sub="Monthly, quarterly, half-yearly or yearly - same entries, wider window."
      />
      <PeriodSwitch
        period={period}
        onPeriod={(p) => {
          setPeriod(p);
          setOffset(0);
        }}
        label={ranges[0].label}
        canPrev={prev.to >= oldest}
        canNext={offset > 0}
        onPrev={() => setOffset((o) => o + 1)}
        onNext={() => setOffset((o) => o - 1)}
      />
      <div className="space-y-2.5">
        {rows.map((r, i) => {
          const { exp, inc, n } = r.totals;
          const kept = inc - exp;
          let badgeClass = "bg-[#f1eee2] text-[#5b6b60]";
          if (inc > 0 && kept / inc >= 0.2) {
            badgeClass = "bg-[#eef5ec] text-[#1e4d3a]";
          } else if (inc > 0 && kept < 0) {
            badgeClass = "bg-[#fbeedd] text-[#b3541e]";
          }
          return (
            <Card key={r.key} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[15px] font-semibold text-[#1c2b23]">
                  {i === 0 && offset === 0 ? `This ${period}` : r.label}
                </p>
                {inc > 0 ? (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${badgeClass}`}
                  >
                    {Math.round((kept / inc) * 100)}% kept
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] text-[#5b6b60]">
                {wordsFor(
                  n,
                  kept,
                  inc,
                  settings.currency,
                  i === 0 && offset === 0
                )}
              </p>
              <p className="mt-2 text-[13px] font-medium text-[#1c2b23]">
                {money(inc, settings.currency)} in ·{" "}
                {money(exp, settings.currency)} out
              </p>
              {i === 0 && period === "month" && sal.count >= 2 ? (
                <p className="mt-1 text-[12.5px] text-[#8a978d]">
                  Salary rhythm: around {money(sal.avg, settings.currency)},{" "}
                  {sal.count} paydays seen.
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
      <p className="px-1 text-[12px] text-[#8a978d]">
        Card purchases sit in the period you made them; bill payments are never
        added on top.
      </p>
    </>
  );
};

export default InsightPeriods;
