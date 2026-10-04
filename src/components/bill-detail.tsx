import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit3,
  Pause,
  Play,
  Receipt,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { div as MotionDiv } from "motion/react-m";
import { useEffect, useMemo, useRef, useState } from "react";

import { useNow } from "../hooks/use-now";
import {
  compareDateStrings,
  isoDay,
  money,
  monthKey,
  prettyDate,
} from "../lib/format";
import { isBillMatch } from "../lib/recurring";
import type { CardSettlement, Recurring, Txn } from "../lib/types";
import type { RecForm } from "./bills";
import BillsForm from "./bills-form";
import { Card } from "./ui";

const withStableOccurrenceKeys = <T,>(
  values: T[],
  identityOf: (value: T) => string
): { item: T; key: string }[] => {
  const occurrences = new Map<string, number>();
  return values.map((item) => {
    const identity = identityOf(item);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return { item, key: `${identity}-${occurrence}` };
  });
};

const EditBillOverlay = ({
  r,
  onUpdate,
  onClose,
}: {
  r: Recurring;
  onUpdate: (uid: string, f: Partial<RecForm>) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
    <MotionDiv
      className="absolute inset-0 bg-[#1c2b23]/45"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    />
    <MotionDiv
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ damping: 26, stiffness: 300, type: "spring" }}
      className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#faf7ef] p-5 pb-8 sm:rounded-[28px]"
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] ring-1 ring-[#1c2b23]/10"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <p className="font-display text-[16px] font-semibold">Edit bill</p>
        <span className="w-16" />
      </div>
      <BillsForm
        initial={{
          amount: r.latestAmount ?? r.amount,
          card: r.card,
          category: r.category,
          frequency: r.frequency,
          nextDue: r.nextDue,
          title: r.title,
        }}
        submitLabel="Save changes"
        onAdd={(form) => {
          onUpdate(r.uid, form);
          onClose();
        }}
        onClose={onClose}
      />
    </MotionDiv>
  </div>
);

const BillOverview = ({
  r,
  currency,
  isVariable,
}: {
  r: Recurring;
  currency: string;
  isVariable: boolean;
}) => {
  const amountRows = withStableOccurrenceKeys(r.amounts ?? [], String);

  return (
    <Card dark className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[22px] font-bold text-[#f7f4ec]">
            {r.title}
          </p>
          <p className="mt-1 text-[13px] text-[#f7f4ec]/70">
            {r.category} · {r.frequency} · {r.active ? "Active" : "Paused"}
          </p>
          {r.card ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#f7f4ec]/10 px-2.5 py-1 text-[12px] text-[#f7f4ec]">
              <CreditCard size={12} /> Credit-card bill
            </p>
          ) : null}
        </div>
        <p className="font-display text-[26px] font-bold text-[#f7f4ec]">
          {money(r.amount, currency)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-2xl bg-[#f7f4ec]/10 p-3">
          <p className="text-[11px] tracking-wide text-[#f7f4ec]/60 uppercase">
            Next due
          </p>
          <p className="mt-1 font-semibold text-[#f7f4ec]">
            {prettyDate(r.nextDue)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f7f4ec]/10 p-3">
          <p className="text-[11px] tracking-wide text-[#f7f4ec]/60 uppercase">
            Last paid
          </p>
          <p className="mt-1 font-semibold text-[#f7f4ec]">
            {r.lastPaid ? prettyDate(r.lastPaid) : "Not yet"}
          </p>
        </div>
      </div>
      {isVariable && r.averageAmount ? (
        <div className="mt-3 rounded-2xl bg-[#f7f4ec]/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#f7f4ec]/60 uppercase">
            <TrendingUp size={12} /> Variable bill
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[13px] text-[#f7f4ec]">
            <span>Average: {money(r.averageAmount, currency)}</span>
            {r.latestAmount ? (
              <span>· Latest: {money(r.latestAmount, currency)}</span>
            ) : null}
            {r.occurrences ? <span>· {r.occurrences} payments</span> : null}
          </div>
          {amountRows.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {amountRows.map(({ item: amount, key }) => (
                <span
                  key={key}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] text-[#f7f4ec]"
                >
                  {money(amount, currency)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};

const RemoveBillConfirmation = ({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) {
      return;
    }
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[70] m-0 flex h-full w-full max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-[#1c2b23]/50"
      aria-labelledby="remove-bill-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#faf7ef] p-5 shadow-xl">
        <p
          id="remove-bill-title"
          className="font-display text-[18px] font-bold text-[#1c2b23]"
        >
          Remove {title}?
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5b6b60]">
          This will stop tracking this bill. You can add it again later.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#b3541e] py-2.5 text-[13px] font-semibold text-white"
          >
            Remove bill
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-white py-2.5 text-[13px] font-medium ring-1 ring-[#1c2b23]/10"
          >
            Keep bill
          </button>
        </div>
      </div>
    </dialog>
  );
};

const BillActions = ({
  r,
  paidThisMonth,
  onClose,
  onPaid,
  onToggle,
  onDelete,
  onSeeMaths,
}: {
  r: Recurring;
  paidThisMonth: boolean;
  onClose: () => void;
  onPaid: (uid: string) => void;
  onToggle: (uid: string) => void;
  onDelete: (uid: string) => void;
  onSeeMaths?: () => void;
}) => {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const showPaidButton = r.active && !paidThisMonth;
  const showPaidLabel = r.active && paidThisMonth;

  const confirmRemove = () => {
    onDelete(r.uid);
    setConfirmingRemove(false);
    onClose();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showPaidButton ? (
          <button
            type="button"
            onClick={() => onPaid(r.uid)}
            className="rounded-full bg-[#1e4d3a] px-4 py-2 text-[13px] font-semibold text-white"
          >
            {r.card ? "Statement settled" : "Mark paid"}
          </button>
        ) : null}
        {showPaidLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5ec] px-4 py-2 text-[13px] font-semibold text-[#1e4d3a]">
            <CheckCircle2 size={14} /> Paid this month
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onToggle(r.uid)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-[13px] font-medium ring-1 ring-[#1c2b23]/12"
        >
          {r.active ? (
            <>
              <Pause size={14} /> Pause
            </>
          ) : (
            <>
              <Play size={14} /> Resume
            </>
          )}
        </button>
        {r.card && onSeeMaths ? (
          <button
            type="button"
            onClick={onSeeMaths}
            className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#1e4d3a] ring-1 ring-[#1e4d3a]/25"
          >
            <Receipt size={14} /> Check maths
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmingRemove(true)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-[13px] text-[#8a978d] ring-1 ring-[#1c2b23]/10"
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>
      {confirmingRemove ? (
        <RemoveBillConfirmation
          title={r.title}
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </>
  );
};

const SettlementHistory = ({
  settlements,
  currency,
}: {
  settlements: CardSettlement[];
  currency: string;
}) => {
  const settlementRows = withStableOccurrenceKeys(
    settlements,
    (settlement) => `${settlement.date}-${settlement.pay}-${settlement.amount}`
  );

  if (settlements.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="font-display px-1 text-[15px] font-semibold text-[#1c2b23]">
        Settlements ({settlements.length})
      </h3>
      <p className="px-1 text-[12.5px] text-[#5b6b60]">
        Credit-card settlements – money moved, not spending counted again.
      </p>
      <Card className="mt-2 divide-y divide-[#1c2b23]/6 overflow-hidden">
        {settlementRows.map(({ item: settlement, key }) => (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-[14px] font-medium text-[#1c2b23]">
                {prettyDate(settlement.date)}
              </p>
              <p className="text-[12px] text-[#8a978d]">
                {settlement.pay} · Settlement
              </p>
            </div>
            <p className="font-display text-[15px] font-bold text-[#1c2b23]">
              {money(settlement.amount, currency)}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
};

const RelatedTransactions = ({
  transactions,
  totalPaid,
  isVariable,
  currency,
}: {
  transactions: Txn[];
  totalPaid: number;
  isVariable: boolean;
  currency: string;
}) => (
  <div>
    <h3 className="font-display px-1 text-[15px] font-semibold text-[#1c2b23]">
      Transactions ({transactions.length}){" "}
      {totalPaid > 0 ? `· Total ${money(totalPaid, currency)}` : ""}
    </h3>
    <p className="px-1 text-[12.5px] text-[#5b6b60]">
      {isVariable
        ? "Variable amounts tracked – same bill title, different amounts (electricity, water, gas) show average/latest."
        : "All transactions linked to this bill by title."}
    </p>
    {transactions.length === 0 ? (
      <Card className="mt-2 p-6 text-center">
        <p className="text-[14px] font-medium text-[#1c2b23]">
          No transactions yet
        </p>
        <p className="mt-1 text-[13px] text-[#5b6b60]">
          When you mark this bill paid, Pebble logs it here. Imported bills show
          history automatically.
        </p>
      </Card>
    ) : (
      <Card className="mt-2 divide-y divide-[#1c2b23]/6 overflow-hidden">
        {transactions.map((transaction) => (
          <div
            key={transaction.uid}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${transaction.kind === "income" ? "bg-[#eef5ec] text-[#1e4d3a]" : "bg-[#f6f2e8] text-[#5b6b60]"}`}
            >
              <Wallet size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[#1c2b23]">
                {transaction.note}
              </p>
              <p className="text-[12px] text-[#8a978d]">
                {prettyDate(transaction.date)} · {transaction.category} ·{" "}
                {transaction.payment}
              </p>
            </div>
            <p
              className={`font-display shrink-0 text-[14.5px] font-bold ${transaction.kind === "income" ? "text-[#1e4d3a]" : "text-[#1c2b23]"}`}
            >
              {transaction.kind === "income" ? "+" : "−"}
              {money(transaction.amount, currency).replace("−", "")}
            </p>
          </div>
        ))}
      </Card>
    )}
  </div>
);

const BillDetail = ({
  r,
  txns,
  currency,
  onClose,
  onPaid,
  onToggle,
  onDelete,
  onUpdate,
  onSeeMaths,
}: {
  r: Recurring;
  txns: Txn[];
  currency: string;
  onClose: () => void;
  onPaid: (uid: string) => void;
  onToggle: (uid: string) => void;
  onDelete: (uid: string) => void;
  onUpdate: (uid: string, f: Partial<RecForm>) => void;
  onSeeMaths?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const now = useNow();

  const relatedTxns = useMemo(
    () =>
      txns
        .filter((transaction) => isBillMatch(r.title, transaction.note))
        .toSorted((a, b) => compareDateStrings(b.date, a.date)),
    [txns, r.title]
  );
  const settlements = useMemo(
    () =>
      [...(r.settlements ?? [])].toSorted((a, b) =>
        compareDateStrings(b.date, a.date)
      ),
    [r.settlements]
  );

  const hasMultipleAmounts = Boolean(r.amounts && r.amounts.length > 1);
  const hasMultipleOccurrences = Boolean(r.occurrences && r.occurrences > 1);
  const isVariable =
    hasMultipleAmounts || hasMultipleOccurrences || r.frequency === "variable";
  const totalPaid = isVariable
    ? (r.amounts ?? []).reduce((sum, amount) => sum + amount, 0)
    : relatedTxns.reduce(
        (sum, transaction) =>
          sum + (transaction.kind === "expense" ? transaction.amount : 0),
        0
      ) + settlements.reduce((sum, settlement) => sum + settlement.amount, 0);

  const today = isoDay(now);
  const paidByLastPaid = Boolean(
    r.lastPaid && monthKey(r.lastPaid) === monthKey(today)
  );
  const paidByTxn = relatedTxns.some(
    (transaction) => monthKey(transaction.date) === monthKey(today)
  );
  const paidThisMonth = paidByLastPaid || paidByTxn;

  if (isEditing) {
    return (
      <EditBillOverlay
        r={r}
        onUpdate={onUpdate}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <MotionDiv
        className="absolute inset-0 bg-[#1c2b23]/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <MotionDiv
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ damping: 26, stiffness: 300, type: "spring" }}
        className="relative max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-[#faf7ef] p-5 pb-8 sm:rounded-[28px]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#1c2b23]/15" />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-[#1c2b23]/10"
          >
            <ArrowLeft size={14} /> Bills
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[13px] font-semibold text-[#f7f4ec]"
          >
            <Edit3 size={14} /> Edit
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <BillOverview r={r} currency={currency} isVariable={isVariable} />
          <BillActions
            r={r}
            paidThisMonth={paidThisMonth}
            onClose={onClose}
            onPaid={onPaid}
            onToggle={onToggle}
            onDelete={onDelete}
            onSeeMaths={onSeeMaths}
          />
          <SettlementHistory settlements={settlements} currency={currency} />
          <RelatedTransactions
            transactions={relatedTxns}
            totalPaid={totalPaid}
            isVariable={isVariable}
            currency={currency}
          />
          <p className="px-1 text-center text-[12px] text-[#8a978d]">
            Pebble keeps variable bills (electricity/water/gas) as one recurring
            with average/latest – same bill title, tracked over time.
          </p>
        </div>
      </MotionDiv>
    </div>
  );
};

export default BillDetail;
