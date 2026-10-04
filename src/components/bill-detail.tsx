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
import { useMemo, useState } from "react";

import { money, monthKey, prettyDate } from "../lib/format";
import { isBillMatch } from "../lib/recurring";
import type { Recurring, Txn } from "../lib/types";
import type { RecForm } from "./bills";
import BillsForm from "./bills-form";
import { Card } from "./ui";

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

  // Related transactions: strict matching to avoid Electricity Bill showing Internet/Water/SBI bills
  // ponytail: reuse isBillMatch helper, stdlib Date, minimal code
  // fix: previously slice(-50) after descending sort returned oldest 50, not newest. Now show all sorted newest first.
  const relatedTxns = useMemo(
    () =>
      txns
        .filter((t) => isBillMatch(r.title, t.note))
        .toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [txns, r.title]
  );

  // All matching for total (previously limited to 50, now full)
  const allMatchingTxns = relatedTxns;

  const settlements = useMemo(
    () =>
      [...(r.settlements ?? [])].toSorted((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      ),
    [r.settlements]
  );

  const isVariable =
    (r.amounts && r.amounts.length > 1) ||
    (r.occurrences && r.occurrences > 1) ||
    r.frequency === "variable";
  const totalPaid = isVariable
    ? (r.amounts ?? []).reduce((s, v) => s + v, 0)
    : allMatchingTxns.reduce(
        (s, t) => s + (t.kind === "expense" ? t.amount : 0),
        0
      ) + settlements.reduce((s, v) => s + v.amount, 0);

  const today = new Date().toISOString().slice(0, 10);
  const paidByLastPaid = r.lastPaid && monthKey(r.lastPaid) === monthKey(today);
  const paidByTxn = allMatchingTxns.some(
    (t) => monthKey(t.date) === monthKey(today)
  );
  const paidThisMonth = Boolean(paidByLastPaid || paidByTxn);

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <MotionDiv
          className="absolute inset-0 bg-[#1c2b23]/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsEditing(false)}
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
              onClick={() => setIsEditing(false)}
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
            onAdd={(f) => {
              onUpdate(r.uid, f);
              setIsEditing(false);
            }}
            onClose={() => setIsEditing(false)}
          />
        </MotionDiv>
      </div>
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
          <Card dark className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[22px] font-bold text-[#f7f4ec]">
                  {r.title}
                </p>
                <p className="mt-1 text-[13px] text-[#f7f4ec]/70">
                  {r.category} · {r.frequency} ·{" "}
                  {r.active ? "Active" : "Paused"}
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
                  {r.occurrences ? (
                    <span>· {r.occurrences} payments</span>
                  ) : null}
                </div>
                {r.amounts && r.amounts.length > 1 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.amounts.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] text-[#f7f4ec]"
                      >
                        {money(a, currency)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          <div className="flex flex-wrap gap-2">
            {r.active && !paidThisMonth ? (
              <button
                type="button"
                onClick={() => onPaid(r.uid)}
                className="rounded-full bg-[#1e4d3a] px-4 py-2 text-[13px] font-semibold text-white"
              >
                {r.card ? "Statement settled" : "Mark paid"}
              </button>
            ) : r.active && paidThisMonth ? (
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
              onClick={() => {
                if (confirm(`Remove ${r.title}?`)) {
                  onDelete(r.uid);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-[13px] text-[#8a978d] ring-1 ring-[#1c2b23]/10"
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>

          {settlements.length > 0 ? (
            <div>
              <h3 className="font-display px-1 text-[15px] font-semibold text-[#1c2b23]">
                Settlements ({settlements.length})
              </h3>
              <p className="px-1 text-[12.5px] text-[#5b6b60]">
                Credit-card settlements – money moved, not spending counted
                again.
              </p>
              <Card className="mt-2 divide-y divide-[#1c2b23]/6 overflow-hidden">
                {settlements.map((s, idx) => (
                  <div
                    key={`${s.date}-${idx}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-[#1c2b23]">
                        {prettyDate(s.date)}
                      </p>
                      <p className="text-[12px] text-[#8a978d]">
                        {s.pay} · Settlement
                      </p>
                    </div>
                    <p className="font-display text-[15px] font-bold text-[#1c2b23]">
                      {money(s.amount, currency)}
                    </p>
                  </div>
                ))}
              </Card>
            </div>
          ) : null}

          <div>
            <h3 className="font-display px-1 text-[15px] font-semibold text-[#1c2b23]">
              Transactions ({relatedTxns.length}){" "}
              {totalPaid > 0 ? `· Total ${money(totalPaid, currency)}` : ""}
            </h3>
            <p className="px-1 text-[12.5px] text-[#5b6b60]">
              {isVariable
                ? "Variable amounts tracked – same bill title, different amounts (electricity, water, gas) show average/latest."
                : "All transactions linked to this bill by title."}
            </p>
            {relatedTxns.length === 0 ? (
              <Card className="mt-2 p-6 text-center">
                <p className="text-[14px] font-medium text-[#1c2b23]">
                  No transactions yet
                </p>
                <p className="mt-1 text-[13px] text-[#5b6b60]">
                  When you mark this bill paid, Pebble logs it here. Imported
                  bills show history automatically.
                </p>
              </Card>
            ) : (
              <Card className="mt-2 divide-y divide-[#1c2b23]/6 overflow-hidden">
                {relatedTxns.map((t) => (
                  <div
                    key={t.uid}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.kind === "income" ? "bg-[#eef5ec] text-[#1e4d3a]" : "bg-[#f6f2e8] text-[#5b6b60]"}`}
                    >
                      <Wallet size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#1c2b23]">
                        {t.note}
                      </p>
                      <p className="text-[12px] text-[#8a978d]">
                        {prettyDate(t.date)} · {t.category} · {t.payment}
                      </p>
                    </div>
                    <p
                      className={`font-display shrink-0 text-[14.5px] font-bold ${t.kind === "income" ? "text-[#1e4d3a]" : "text-[#1c2b23]"}`}
                    >
                      {t.kind === "income" ? "+" : "−"}
                      {money(t.amount, currency).replace("−", "")}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </div>

          <p className="px-1 text-center text-[11px] text-[#8a978d]">
            Pebble keeps variable bills (electricity/water/gas) as one recurring
            with average/latest – ponytail: reuse format/money, stdlib Date.
          </p>
        </div>
      </MotionDiv>
    </div>
  );
};

export default BillDetail;
