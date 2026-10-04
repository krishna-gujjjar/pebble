import { HandCoins, Plus } from "lucide-react";

import { money } from "../lib/format";
import type { Loan } from "../lib/types";
import LoanCard from "./loan-card";
import { Card, Empty, SectionTitle } from "./ui";

const Lending = ({
  loans,
  currency,
  onRepay,
  onSettle,
  onDelete,
  onNew,
}: {
  loans: Loan[];
  currency: string;
  onRepay: (uid: string, amt: number) => void;
  onSettle: (uid: string) => void;
  onDelete: (uid: string) => void;
  onNew: () => void;
}) => {
  const open = loans.filter((l) => l.status === "open");
  const done = loans.filter((l) => l.status === "settled");
  const owedToYou = open
    .filter((l) => l.direction === "lent")
    .reduce((s, l) => s + (l.amount - l.repaid), 0);
  const youOwe = open
    .filter((l) => l.direction === "borrowed")
    .reduce((s, l) => s + (l.amount - l.repaid), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card dark className="p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#f7f4ec]/70">
            <HandCoins size={13} /> Owed to you
          </p>
          <p className="font-display mt-1 text-[24px] font-bold text-[#f7f4ec]">
            {money(owedToYou, currency)}
          </p>
        </Card>
        <div className="rounded-3xl bg-[#fbf3e3] p-4 ring-1 ring-[#8a4b12]/10">
          <p className="text-[12px] font-medium text-[#8a4b12]">You owe</p>
          <p className="font-display mt-1 text-[24px] font-bold text-[#1c2b23]">
            {money(youOwe, currency)}
          </p>
        </div>
      </div>

      <SectionTitle
        title="Lending"
        sub="Pebble remembers, so friendships stay light. Money in and out of your pocket is mirrored in Entries."
        action={
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1 rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[13px] font-semibold text-[#f7f4ec]"
          >
            <Plus size={14} /> New
          </button>
        }
      />

      {loans.length === 0 ? (
        <Card>
          <Empty
            title="Nothing lent, nothing owed"
            body="When money moves between people, log it here in seconds - Pebble will gently keep track and mirror it in your entries."
            action={
              <button
                type="button"
                onClick={onNew}
                className="rounded-full bg-[#1c2b23] px-4 py-2 text-[13.5px] font-semibold text-[#f7f4ec]"
              >
                Log your first one
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {open.map((l) => (
              <LoanCard
                key={l.uid}
                loan={l}
                currency={currency}
                onRepay={onRepay}
                onSettle={onSettle}
                onDelete={onDelete}
              />
            ))}
          </div>
          {done.length > 0 ? (
            <div className="space-y-3 pt-1">
              <p className="px-1 text-[12px] font-semibold tracking-[0.08em] text-[#8a978d] uppercase">
                Settled · {done.length}
              </p>
              {done.map((l) => (
                <LoanCard
                  key={l.uid}
                  loan={l}
                  currency={currency}
                  onRepay={onRepay}
                  onSettle={onSettle}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Lending;
