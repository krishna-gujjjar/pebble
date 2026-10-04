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
import type { CardSettlement, Recurring, Txn } from "../lib/types";
import { Card } from "./ui";

const getStateText = (
  recurring: Recurring,
  today: string,
  isPaid: boolean,
  overdue: boolean,
  isVariableFreq: boolean
): string => {
  const lastPaidDate = recurring.lastPaid
    ? prettyDate(recurring.lastPaid)
    : prettyDate(today);
  const lastPaidSummary = recurring.lastPaid
    ? `last ${lastPaidDate}`
    : "no history";

  if (isVariableFreq) {
    if (isPaid && recurring.active) {
      return `Refilled ${lastPaidDate} · variable`;
    }
    if (recurring.active) {
      return `Variable · refill as needed · ${lastPaidSummary}`;
    }
  } else if (isPaid && recurring.active) {
    return `Paid ${prettyDate(recurring.lastPaid || today)} · next ${prettyDate(recurring.nextDue)}`;
  } else if (overdue) {
    return `Was due ${prettyDate(recurring.nextDue)} - worth a check`;
  } else if (recurring.active) {
    return `Due ${prettyDate(recurring.nextDue)}`;
  }

  return "Paused";
};

const getStateClass = (
  isPaid: boolean,
  overdue: boolean,
  soon: boolean
): string => {
  if (isPaid) {
    return "font-medium text-[#1e4d3a]";
  }
  if (overdue) {
    return "font-semibold text-[#b3541e]";
  }
  if (soon) {
    return "font-medium text-[#8a4b12]";
  }
  return "text-[#5b6b60]";
};

const CardBillNotice = ({
  idleCard,
  lastSettled,
  cardSpent,
  currency,
}: {
  idleCard: boolean;
  lastSettled: CardSettlement | undefined;
  cardSpent?: number;
  currency: string;
}) => (
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
        {money(lastSettled.amount, currency)} by {lastSettled.pay} - recorded in
        Bills, never counted again.
        {cardSpent ? ` Since then: ${money(cardSpent, currency)} on card.` : ""}
      </p>
    ) : null}
  </div>
);

const renderBillSummary = ({
  recurring,
  currency,
  stateText,
  stateClass,
  onClick,
}: {
  recurring: Recurring;
  currency: string;
  stateText: string;
  stateClass: string;
  onClick?: (uid: string) => void;
}) => {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px] font-semibold text-[#1c2b23]">
          {recurring.title}
        </span>
        <span className={`mt-0.5 block text-[12.5px] ${stateClass}`}>
          {stateText} · {money(recurring.amount, currency)} ·{" "}
          {recurring.frequency}
          {recurring.occurrences && recurring.occurrences > 1
            ? ` · ${recurring.occurrences} payments`
            : ""}
          {recurring.averageAmount &&
          recurring.amounts &&
          recurring.amounts.length > 1
            ? ` · avg ${money(recurring.averageAmount, currency)}`
            : ""}
        </span>
      </span>
      <span className="font-display shrink-0 text-[17px] font-bold text-[#1c2b23]">
        {money(recurring.amount, currency)}
      </span>
    </>
  );
  const className = "flex items-center gap-3";

  return onClick ? (
    <button
      type="button"
      className={`w-full bg-transparent p-0 text-left ${className}`}
      onClick={() => onClick(recurring.uid)}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
};

const BillActions = ({
  r,
  isPaid,
  isVariableFreq,
  onPaid,
  onToggle,
  onDelete,
  onSeeMaths,
  onClick,
}: {
  r: Recurring;
  isPaid: boolean;
  isVariableFreq: boolean;
  onPaid: (uid: string) => void;
  onToggle: (uid: string) => void;
  onDelete: (uid: string) => void;
  onSeeMaths?: () => void;
  onClick?: (uid: string) => void;
}) => {
  let paidButtonLabel = "Mark paid";
  if (r.card) {
    paidButtonLabel = "Statement settled";
  } else if (isVariableFreq) {
    paidButtonLabel = "Refilled";
  }

  const showPaidButton = r.active && !isPaid;
  const showPaidLabel = r.active && isPaid;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {showPaidButton ? (
        <button
          type="button"
          onClick={() => onPaid(r.uid)}
          className="rounded-full bg-[#1e4d3a] px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
        >
          {paidButtonLabel}
        </button>
      ) : null}
      {showPaidLabel ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5ec] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1e4d3a]">
          <CheckCircle2 size={12} />{" "}
          {isVariableFreq ? "Refilled this period" : "Paid this month"}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => onToggle(r.uid)}
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
          onClick={onSeeMaths}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#1e4d3a] ring-1 ring-[#1e4d3a]/25"
        >
          <Receipt size={12} /> Check the maths
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onDelete(r.uid)}
        className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] text-[#8a978d] ring-1 ring-[#1c2b23]/10"
      >
        <Trash2 size={12} /> Remove
      </button>
      {onClick ? (
        <button
          type="button"
          onClick={() => onClick(r.uid)}
          className="inline-flex items-center gap-1 rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[12.5px] font-medium text-[#f7f4ec]"
        >
          View
        </button>
      ) : null}
    </div>
  );
};

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
  const stateText = getStateText(r, today, isPaid, overdue, isVariableFreq);
  const stateClass = getStateClass(isPaid, overdue, soon);

  return (
    <Card
      className={`p-4 ${overdue ? "ring-2 !ring-[#b3541e]/40" : ""} ${r.active ? "" : "opacity-60"} ${onClick ? "cursor-pointer hover:ring-2 hover:ring-[#1e4d3a]/20" : ""}`}
    >
      {renderBillSummary({
        currency,
        onClick,
        recurring: r,
        stateClass,
        stateText,
      })}

      {r.card ? (
        <CardBillNotice
          idleCard={idleCard}
          lastSettled={lastSettled}
          cardSpent={cardSpent}
          currency={currency}
        />
      ) : null}

      <BillActions
        r={r}
        isPaid={isPaid}
        isVariableFreq={isVariableFreq}
        onPaid={onPaid}
        onToggle={onToggle}
        onDelete={onDelete}
        onSeeMaths={onSeeMaths}
        onClick={onClick}
      />
    </Card>
  );
};

export default BillRow;
