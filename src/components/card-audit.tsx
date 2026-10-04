import { ArrowRight, CheckCircle2, CreditCard, Landmark } from "lucide-react";

import { CARD, settlementsIn } from "../lib/card";
import { money, prettyDate } from "../lib/format";
import type { Range } from "../lib/period";
import type { Recurring, Txn } from "../lib/types";
import { Card } from "./ui";

const Row = ({
  amount,
  currency,
  note,
  sub,
}: {
  amount: number;
  currency: string;
  note: string;
  sub: string;
}) => (
  <div className="flex items-baseline justify-between gap-3 border-t border-[#1c2b23]/6 pt-2 first:border-0 first:pt-0">
    <span className="min-w-0">
      <span className="block truncate text-[13.5px] font-medium text-[#1c2b23]">
        {note}
      </span>
      <span className="block text-[12px] text-[#8a978d]">{sub}</span>
    </span>
    <span className="font-display shrink-0 text-[14px] font-bold text-[#1c2b23]">
      {money(amount, currency)}
    </span>
  </div>
);

/** Card purchases counted as spending, next to the bill payments that are not. */
const CardAudit = ({
  items,
  recurrings,
  range,
  currency,
}: {
  items: Txn[];
  recurrings: Recurring[];
  range: Range;
  currency: string;
}) => {
  const purchases = items.filter(
    (t) => t.kind === "expense" && t.payment === CARD && !t.loanUid
  );
  const settlements = settlementsIn(recurrings, range);
  if (purchases.length === 0 && settlements.length === 0) {
    return null;
  }
  let purchaseTotal = 0;
  for (const t of purchases) {
    purchaseTotal += t.amount;
  }
  let settledTotal = 0;
  for (const s of settlements) {
    settledTotal += s.amount;
  }
  const settlementNoun =
    settlements.length === 1 ? "settlement" : "settlements";
  const newest = purchases.toSorted((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-[#1e4d3a]" />
        <p className="font-display text-[15.5px] font-semibold text-[#1c2b23]">
          Credit card, counted once
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#f6f2e8] p-3">
          <p className="text-[12px] font-medium text-[#5b6b60]">
            Card purchases
          </p>
          <p className="font-display mt-0.5 text-[16.5px] font-bold text-[#1c2b23]">
            {money(purchaseTotal, currency)}
          </p>
          <p className="text-[12px] text-[#8a978d]">
            {purchases.length} entr{purchases.length === 1 ? "y" : "ies"} · in
            “Went out”
          </p>
        </div>
        <div className="rounded-2xl bg-[#eef5ec] p-3">
          <p className="text-[12px] font-medium text-[#1e4d3a]">
            Bill paid to bank
          </p>
          <p className="font-display mt-0.5 text-[16.5px] font-bold text-[#1e4d3a]">
            {money(settledTotal, currency)}
          </p>
          <p className="text-[12px] text-[#3d4b42]">
            {settlements.length
              ? `${settlements.length} ${settlementNoun} · not added again`
              : "nothing settled in this period"}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-[#eef5ec] px-3 py-2 text-[12.5px] leading-relaxed text-[#1e4d3a]">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
        {purchases.length === 0 && settlements.length > 0
          ? "Nothing is subtracted twice: this period only has the payment. The purchases it clears were already counted in the months you swiped them - open those months above to see them."
          : "Nothing is subtracted twice: the purchases above are the only card money in this period's totals, and paying the bill is a transfer, so it never enters \u201CWent out\u201D."}
      </p>

      {newest.length > 0 ? (
        <div className="mt-3.5">
          <p className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase">
            Bought on the card
          </p>
          <div className="mt-2 space-y-2">
            {newest.slice(0, 5).map((t) => (
              <Row
                key={t.uid}
                amount={t.amount}
                currency={currency}
                note={t.note || t.category}
                sub={`${prettyDate(t.date)} · ${t.category} · paid by Card`}
              />
            ))}
          </div>
          {newest.length > 5 ? (
            <p className="mt-2 text-[12px] text-[#8a978d]">
              + {newest.length - 5} more card entr
              {newest.length - 5 === 1 ? "y" : "ies"} in this period.
            </p>
          ) : null}
        </div>
      ) : null}

      {settlements.length > 0 ? (
        <div className="mt-3.5">
          <p className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase">
            Paid to the bank
          </p>
          <div className="mt-2 space-y-2">
            {settlements.slice(0, 4).map((s) => (
              <div
                key={`${s.date}-${s.amount}`}
                className="flex items-center gap-2 rounded-2xl bg-[#f6f2e8] px-3 py-2"
              >
                <Landmark size={14} className="shrink-0 text-[#1e4d3a]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-[#1c2b23]">
                    Card bill settled {prettyDate(s.date)}
                  </span>
                  <span className="block text-[12px] text-[#8a978d]">
                    paid by {s.pay} · recorded in Bills, no spending entry
                  </span>
                </span>
                <span className="font-display shrink-0 text-[13.5px] font-bold text-[#1e4d3a]">
                  {money(s.amount, currency)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#8a978d]">
            <ArrowRight size={12} className="shrink-0" />
            Settlement history lives in Bills, on the card row.
          </p>
        </div>
      ) : null}
    </Card>
  );
};

export default CardAudit;
