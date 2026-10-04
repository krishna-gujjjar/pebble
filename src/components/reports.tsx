import { useState } from "react";

import { CARD } from "../lib/card";
import { addMonths, monthKey } from "../lib/format";
import type { Period } from "../lib/period";
import { rangeFor, rangeTxns, totalsFor } from "../lib/period";
import type { Recurring, Txn } from "../lib/types";
import BiggestOutflows from "./biggest-outflows";
import CardAudit from "./card-audit";
import PeriodSwitch from "./period-switch";
import ReportsCats from "./reports-cats";
import ReportsSummary from "./reports-summary";
import TrendChart from "./trend-chart";
import { SectionTitle } from "./ui";

const Reports = ({
  txns,
  recurrings,
  currency,
}: {
  txns: Txn[];
  recurrings: Recurring[];
  currency: string;
}) => {
  const now = new Date();
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const range = rangeFor(period, now, offset);
  const items = rangeTxns(txns, range);
  const totals = totalsFor(items, CARD);

  const byCat = (() => {
    const m = new Map<string, number>();
    for (const t of items) {
      if (t.kind === "expense") {
        m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
      }
    }
    return [...m.entries()].toSorted((a, b) => b[1] - a[1]);
  })();

  const trend = (() => {
    const arr: { key: string; inc: number; exp: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const k = monthKey(addMonths(range.to, -i));
      let exp = 0;
      let inc = 0;
      for (const t of txns) {
        if (monthKey(t.date) !== k) {
          continue;
        }
        if (t.kind === "income") {
          inc += t.amount;
        } else {
          exp += t.amount;
        }
      }
      arr.push({ exp, inc, key: k });
    }
    return arr;
  })();

  const biggest = items
    .filter((t) => t.kind === "expense")
    .toSorted((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const oldest = txns.length
    ? txns.map((t) => t.date).toSorted()[0]
    : range.from;
  const prev = rangeFor(period, now, offset + 1);
  const canPrev = prev.to >= oldest;
  const canNext = offset > 0;
  const pick = (p: Period) => {
    setPeriod(p);
    setOffset(0);
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Reports"
        sub="Patterns, not spreadsheets - over any window you like."
      />
      <PeriodSwitch
        period={period}
        onPeriod={pick}
        label={range.label}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => setOffset((o) => o + 1)}
        onNext={() => setOffset((o) => o - 1)}
      />
      <ReportsSummary totals={totals} currency={currency} />
      <CardAudit
        items={items}
        recurrings={recurrings}
        range={range}
        currency={currency}
      />
      <ReportsCats byCat={byCat} exp={totals.exp} currency={currency} />
      <TrendChart trend={trend} currency={currency} />
      <BiggestOutflows biggest={biggest} currency={currency} />
    </div>
  );
};

export default Reports;
