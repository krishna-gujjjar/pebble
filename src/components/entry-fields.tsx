import { Lightbulb } from "lucide-react";
import { useState } from "react";

import { categoryMedian } from "../lib/analytics";
import { money } from "../lib/format";
import type { Kind, Txn } from "../lib/types";
import { EXPENSE_CATS, INCOME_CATS } from "../lib/types";
import AmountField from "./amount-field";
import PaymentPicker from "./payment-picker";

const NOTE_HINTS = {
  Dining: ["Lunch out", "Neighbourhood café", "Dinner with friends"],
  Freelance: ["Invoice payment"],
  Fun: ["Cinema evening", "Weekend outing"],
  Groceries: ["Weekly groceries", "Fresh market run", "Supermarket top-up"],
  Health: ["Pharmacy", "Check-up"],
  Rent: ["Monthly rent"],
  Salary: ["Monthly salary"],
  Shopping: ["Home basics", "Clothes refresh"],
  Subscriptions: ["Streaming plan", "Music plan"],
  Transport: ["Metro top-up", "Ride home", "Fuel refill"],
  Travel: ["Train tickets", "Weekend trip"],
  Utilities: ["Electricity bill", "Internet bill"],
};

const EntryFields = ({
  kind,
  txns,
  currency,
  amount,
  onAmount,
  category,
  onCategory,
  date,
  onDate,
  note,
  onNote,
  onPickPayment,
  onQuickSave,
}: {
  kind: Kind;
  txns: Txn[];
  currency: string;
  amount: string;
  onAmount: (v: string) => void;
  category: string;
  onCategory: (c: string) => void;
  date: string;
  onDate: (d: string) => void;
  note: string;
  onNote: (n: string) => void;
  onPickPayment: (p: string) => void;
  onQuickSave: () => void;
}) => {
  const [payment, setPayment] = useState("Cash");
  const cats = kind === "income" ? INCOME_CATS : EXPENSE_CATS;
  const usual = (() => categoryMedian(txns, category))();

  const matches = (() => {
    const needle = note.toLowerCase().trim();
    if (!needle) {
      return [];
    }
    const seen = new Set<string>();
    const out: Txn[] = [];
    for (const t of [...txns].toReversed()) {
      const key = `${t.category}|${t.note}|${t.amount}`;
      const hit =
        t.kind === kind &&
        !t.loanUid &&
        !seen.has(key) &&
        `${t.note} ${t.category} ${t.payment}`.toLowerCase().includes(needle);
      if (hit) {
        seen.add(key);
        out.push(t);
        if (out.length >= 5) {
          break;
        }
      }
    }
    return out;
  })();

  const recentNotes = (() => {
    const seen = new Set<string>();
    for (const t of txns) {
      if (t.category === category && !t.loanUid && t.note) {
        seen.add(t.note);
        if (seen.size >= 4) {
          break;
        }
      }
    }
    return [...seen].slice(0, 4);
  })();
  const hints = Object.entries(NOTE_HINTS).find(
    ([k]) => k === category
  )?.[1] ?? ["Everyday entry"];

  const pickPayment = (p: string) => {
    setPayment(p);
    onPickPayment(p);
  };

  const fill = (t: Txn) => {
    onAmount(String(t.amount));
    onCategory(t.category);
    onNote(t.note || t.category);
    pickPayment(t.payment || "Cash");
  };

  return (
    <>
      <AmountField
        amount={amount}
        onAmount={onAmount}
        currency={currency}
        onEnter={onQuickSave}
        hint={
          usual > 0 ? (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#5b6b60]">
              <Lightbulb size={13} className="shrink-0 text-[#b97f1f]" />{" "}
              Usually around {money(usual, currency)} for{" "}
              {category.toLowerCase()}.
            </p>
          ) : undefined
        }
      />
      <PaymentPicker value={payment} onChange={pickPayment} />

      <div className="mt-3 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onCategory(c)}
            className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-all ${category === c ? "bg-[#1c2b23] text-[#f7f4ec]" : "bg-white text-[#3d4b42] ring-1 ring-[#1c2b23]/10"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2.5">
        <input
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={
            kind === "income"
              ? "What was this for? Type to match a past entry…"
              : "What was this? Type to match a past entry…"
          }
          className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-[#1c2b23] ring-1 ring-[#1c2b23]/10 outline-none placeholder:text-[#9aa79d] focus:ring-2 focus:ring-[#1e4d3a]"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
        />

        {matches.length > 0 ? (
          <div className="space-y-1.5">
            <p className="px-1 text-[11.5px] font-semibold tracking-wide text-[#8a978d] uppercase">
              Past entries - tap to reuse
            </p>
            {matches.map((t) => (
              <button
                key={t.uid}
                type="button"
                onClick={() => fill(t)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#f6f2e8] px-3.5 py-2.5 text-left ring-1 ring-[#1c2b23]/8"
              >
                <span className="min-w-0 truncate text-[13.5px] font-medium text-[#1c2b23]">
                  {t.note || t.category}
                  <span className="text-[#8a978d]"> · {t.category}</span>
                </span>
                <span className="font-display shrink-0 text-[13.5px] font-bold text-[#1c2b23]">
                  {t.kind === "income" ? "+" : "−"}
                  {money(t.amount, currency).replace("−", "")}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(recentNotes.length ? recentNotes : hints).slice(0, 4).map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => onNote(h)}
                className="rounded-full bg-[#efe9d8] px-3 py-1.5 text-[12.5px] text-[#5b6b60] hover:bg-[#e4dcc4]"
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default EntryFields;
