import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";

import type { RecurringCandidate } from "../lib/analytics";
import { cardSpendSince } from "../lib/card";
import { isoDay, money } from "../lib/format";
import type { Frequency, Recurring, Txn } from "../lib/types";
import BillDetail from "./bill-detail";
import BillRow from "./bill-row";
import BillsForm from "./bills-form";
import { Card, Empty, SectionTitle } from "./ui";

export interface RecForm {
  title: string;
  amount: number;
  category: string;
  frequency: Frequency;
  nextDue: string;
  /** credit-card bill: settles without logging any spending */
  card?: boolean;
}

const Bills = ({
  recurrings,
  currency,
  candidates,
  txns,
  onPaid,
  onToggle,
  onDelete,
  onAdd,
  onUpdate,
  onTrack,
  onSeeMaths,
}: {
  recurrings: Recurring[];
  currency: string;
  candidates: RecurringCandidate[];
  txns: Txn[];
  onPaid: (uid: string) => void;
  onToggle: (uid: string) => void;
  onDelete: (uid: string) => void;
  onAdd: (f: RecForm) => void;
  onUpdate: (uid: string, f: Partial<RecForm>) => void;
  onTrack: (c: { title: string; amount: number; category: string }) => void;
  onSeeMaths: () => void;
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const today = isoDay(new Date());
  const active = recurrings.filter((r) => r.active);
  const paused = recurrings.filter((r) => !r.active);
  const selected = selectedUid
    ? recurrings.find((r) => r.uid === selectedUid)
    : null;
  let monthlyLoad = 0;
  for (const r of active) {
    if (r.frequency === "weekly") {
      monthlyLoad += r.amount * 4.33;
    } else if (r.frequency === "yearly") {
      monthlyLoad += r.amount / 12;
    } else if (r.frequency === "variable") {
      // Gas cylinder: not every month, count as 0.5x for load estimate (usage based)
      monthlyLoad += r.amount * 0.6;
    } else {
      monthlyLoad += r.amount;
    }
  }

  return (
    <div className="space-y-4">
      <Card dark className="flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f7f4ec]/10">
          <CalendarClock size={22} className="text-[#f7f4ec]" />
        </span>
        <div>
          <p className="text-[12.5px] text-[#f7f4ec]/70">
            Recurring load · roughly
          </p>
          <p className="font-display text-[26px] font-bold text-[#f7f4ec]">
            {money(monthlyLoad, currency)}
            <span className="text-[14px] font-medium text-[#f7f4ec]/60">
              {" "}
              /mo
            </span>
          </p>
        </div>
      </Card>

      {candidates.length > 0 ? (
        <div className="rounded-3xl border border-dashed border-[#b97f1f]/40 bg-[#fbf7ea] p-4 ring-1 ring-[#b97f1f]/10">
          <p className="font-display text-[15px] font-semibold text-[#1c2b23]">
            These look recurring - want Pebble to watch them?
          </p>
          <p className="mt-0.5 text-[13px] text-[#5b6b60]">
            Spotted from your history. One tap to track, no forms.
          </p>
          <div className="mt-3 space-y-2">
            {candidates.map((c) => (
              <div
                key={c.title}
                className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-[#1c2b23]/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#1c2b23]">
                    {c.title}
                  </p>
                  <p className="text-[12.5px] text-[#5b6b60]">
                    {money(c.amount, currency)} · {c.count} similar payments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTrack(c)}
                  className="shrink-0 rounded-full bg-[#1e4d3a] px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
                >
                  Track it
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <SectionTitle
        title="Bills & recurrings"
        sub="Due dates watched quietly, without the nagging."
        action={
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[13px] font-semibold text-[#f7f4ec]"
          >
            <Plus size={14} /> New
          </button>
        }
      />

      {formOpen ? (
        <BillsForm onAdd={onAdd} onClose={() => setFormOpen(false)} />
      ) : null}

      {recurrings.length === 0 && !formOpen ? (
        <Card>
          <Empty
            title="No bills tracked yet"
            body="Add the ones that repeat - rent, internet, subscriptions - and Pebble will remind you before they're due."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {[...recurrings]
            .toSorted((a, b) => (a.nextDue < b.nextDue ? -1 : 1))
            .map((r) => (
              <BillRow
                key={r.uid}
                r={r}
                currency={currency}
                today={today}
                cardSpent={
                  r.card ? cardSpendSince(txns, r.lastPaid) : undefined
                }
                txns={txns}
                onPaid={onPaid}
                onToggle={onToggle}
                onDelete={onDelete}
                onSeeMaths={onSeeMaths}
                onClick={setSelectedUid}
              />
            ))}
          {paused.length > 0 && active.length > 0 ? (
            <p className="px-1 text-[12px] text-[#8a978d]">
              {paused.length} paused - quietly kept, out of the way.
            </p>
          ) : null}
        </div>
      )}

      {selected ? (
        <BillDetail
          r={selected}
          txns={txns}
          currency={currency}
          onClose={() => setSelectedUid(null)}
          onPaid={onPaid}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onSeeMaths={onSeeMaths}
        />
      ) : null}
    </div>
  );
};

export default Bills;
