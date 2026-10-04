import {
  CheckCircle2,
  CreditCard,
  Pause,
  Play,
  Receipt,
  Trash2,
} from "lucide-react";

import { money, prettyDate } from "../lib/format";
import { isDueSoon, isOverdue, isPaidThisMonth } from "../lib/recurring";
import type { Recurring, Txn } from "../lib/types";
import { Card } from "./ui";

const BillRow = ({
  r,
  currency,
  today,
  cardSpent,
  txns,
  onPaid,
  onToggle,
  onDelete,
  onSeeMaths,
  onClick,
}: {
  r: Recurring;
  currency: string;
  today: string;
  /** card bills only: spending on the card since this bill was last settled */
  cardSpent?: number;
  txns?: Txn[];
  onPaid: (uid: string) => void;
  onToggle: (uid: string) => void;
  onDelete: (uid: string) => void;
  onSeeMaths?: () => void;
  onClick?: (uid: string) => void;
}) => {
  const lastSettled = (r.settlements ?? []).at(-1);
  const isVariableFreq = r.frequency === "variable";
  const idleCard = Boolean(r.card) && cardSpent === 0;
  const isPaid = isPaidThisMonth(r, today, txns);
  const overdue = isOverdue(r, today, txns);
  const soon = isDueSoon(r, today, txns);
  let stateText = "Paused";
  if (isVariableFreq) {
    if (isPaid && r.active) {
      stateText = `Refilled ${r.lastPaid ? prettyDate(r.lastPaid) : prettyDate(today)} · variable`;
    } else if (r.active) {
      stateText = `Variable · refill as needed · ${r.lastPaid ? `last ${prettyDate(r.lastPaid)}` : "no history"}`;
    }
  } else if (isPaid && r.active) {
    stateText = `Paid ${prettyDate(r.lastPaid || today)} · next ${prettyDate(r.nextDue)}`;
  } else if (overdue) {
    stateText = `Was due ${prettyDate(r.nextDue)} - worth a check`;
  } else if (r.active) {
    stateText = `Due ${prettyDate(r.nextDue)}`;
  }
  let stateClass = "text-[#5b6b60]";
  if (isPaid) {
    stateClass = "font-medium text-[#1e4d3a]";
  } else if (overdue) {
    stateClass = "font-semibold text-[#b3541e]";
  } else if (soon) {
    stateClass = "font-medium text-[#8a4b12]";
  }
  return (
    <Card
      className={`p-4 ${overdue ? "ring-2 !ring-[#b3541e]/40" : ""} ${r.active ? "" : "opacity-60"} ${onClick ? "cursor-pointer hover:ring-2 hover:ring-[#1e4d3a]/20" : ""}`}
      // ponytail: native click for detail, stopPropagation for inner buttons
    >
      <div
        className="flex items-center gap-3"
        onClick={() => onClick?.(r.uid)}
        role={onClick ? "button" : undefined}
      >
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-[15.5px] font-semibold text-[#1c2b23]">
            {r.title}
          </p>
          <p className={`mt-0.5 text-[12.5px] ${stateClass}`}>
            {stateText} · {money(r.amount, currency)} · {r.frequency}
            {r.occurrences && r.occurrences > 1
              ? ` · ${r.occurrences} payments`
              : ""}
            {r.averageAmount && r.amounts && r.amounts.length > 1
              ? ` · avg ${money(r.averageAmount, currency)}`
              : ""}
          </p>
        </div>
        <p className="font-display shrink-0 text-[17px] font-bold text-[#1c2b23]">
          {money(r.amount, currency)}
        </p>
      </div>

      {r.card ? (
        <div className="mt-2.5 rounded-2xl bg-[#eef5ec] px-3 py-2.5">
          <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[#1e4d3a]">
            <CreditCard size={14} className="mt-0.5 shrink-0" />
            {idleCard
              ? "No new card spending since you settled this - nothing to pay right now."
              : "Settling this logs no spending. The card purchases already count in the month you made them."}
          </p>
          {lastSettled ? (
            <p className="mt-1.5 pl-[21px] text-[12px] text-[#3d4b42]">
              Last paid {prettyDate(lastSettled.date)} ·{" "}
              {money(lastSettled.amount, currency)} by {lastSettled.pay} -
              recorded in Bills, never counted again.
              {cardSpent
                ? ` Since then: ${money(cardSpent, currency)} on card.`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {r.active && !isPaid ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPaid(r.uid);
            }}
            className="rounded-full bg-[#1e4d3a] px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
          >
            {r.card
              ? "Statement settled"
              : isVariableFreq
                ? "Refilled"
                : "Mark paid"}
          </button>
        ) : r.active && isPaid ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5ec] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1e4d3a]">
            <CheckCircle2 size={12} />{" "}
            {isVariableFreq ? "Refilled this period" : "Paid this month"}
          </span>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(r.uid);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#3d4b42] ring-1 ring-[#1c2b23]/12"
        >
          {r.active ? (
            <>
              <Pause size={12} /> Pause
            </>
          ) : (
            <>
              <Play size={12} /> Resume
            </>
          )}
        </button>
        {r.card && onSeeMaths ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeeMaths();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#1e4d3a] ring-1 ring-[#1e4d3a]/25"
          >
            <Receipt size={12} /> Check the maths
          </button>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(r.uid);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] text-[#8a978d] ring-1 ring-[#1c2b23]/10"
        >
          <Trash2 size={12} /> Remove
        </button>
        {onClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(r.uid);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[12.5px] font-medium text-[#f7f4ec]"
          >
            View
          </button>
        ) : null}
      </div>
    </Card>
  );
};

export default BillRow;
