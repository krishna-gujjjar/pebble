import { useState } from "react";

import { cardBillLabel } from "../lib/card";
import { isoDay, parseAmount } from "../lib/format";
import type { Frequency } from "../lib/types";
import { EXPENSE_CATS } from "../lib/types";
import type { RecForm } from "./bills";
import { Card } from "./ui";

const FREQS: Frequency[] = ["monthly", "weekly", "yearly", "variable"];

const BillsForm = ({
  onAdd,
  onClose,
  initial,
  submitLabel,
}: {
  onAdd: (f: RecForm) => void;
  onClose: () => void;
  initial?: Partial<RecForm>;
  submitLabel?: string;
}) => {
  const [title, setTitle] = useState(initial?.title || "");
  const [amount, setAmount] = useState(
    initial?.amount == null ? "" : String(initial.amount)
  );
  const [category, setCategory] = useState(initial?.category || "Utilities");
  const [frequency, setFrequency] = useState<Frequency>(
    initial?.frequency || "monthly"
  );
  const [nextDue, setNextDue] = useState(
    () => initial?.nextDue || isoDay(new Date())
  );
  const [card, setCard] = useState(initial?.card || false);
  const [error, setError] = useState("");

  const submit = () => {
    const v = parseAmount(amount);
    if (!title.trim() && !card) {
      setError("Give it a name - e.g. Internet bill.");
      return;
    }
    if (!v || v <= 0) {
      setError("Add the usual amount.");
      return;
    }
    if (!nextDue) {
      setError("When is it next due?");
      return;
    }
    onAdd({
      amount: v,
      card,
      category,
      frequency,
      nextDue,
      title: title.trim() || cardBillLabel,
    });
    setTitle("");
    setAmount("");
    setError("");
    onClose();
  };

  return (
    <Card className="space-y-2.5 p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What is it? e.g. Internet bill"
        className="w-full rounded-xl bg-[#f6f2e8] px-3.5 py-2.5 text-[14.5px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Amount"
          className="w-full rounded-xl bg-[#f6f2e8] px-3.5 py-2.5 text-[14.5px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
        />
        <input
          type="date"
          value={nextDue}
          onChange={(e) => setNextDue(e.target.value)}
          className="w-full rounded-xl bg-[#f6f2e8] px-3.5 py-2.5 text-[14.5px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EXPENSE_CATS.slice(0, 8).map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${category === c ? "bg-[#1c2b23] text-[#f7f4ec]" : "bg-[#f6f2e8] text-[#3d4b42] ring-1 ring-[#1c2b23]/10"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f2e8] px-3.5 py-2.5">
        <span className="text-[12.5px] font-medium text-[#3d4b42]">
          Credit-card bill
          <span className="mt-0.5 block text-[12px] leading-relaxed text-[#8a978d]">
            Settling it won&apos;t log spending - the purchases already count
            the month you made them.
          </span>
        </span>
        <input
          type="checkbox"
          checked={card}
          onChange={(e) => setCard(e.target.checked)}
          className="size-5 shrink-0 accent-[#1e4d3a]"
        />
      </label>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#f6f2e8] p-1">
        {FREQS.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setFrequency(f)}
            className={`rounded-lg py-2 text-[13px] font-semibold capitalize ${frequency === f ? "bg-white text-[#1c2b23] shadow-sm" : "text-[#5b6b60]"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {error ? (
        <p className="rounded-xl bg-[#fbeedf] px-3.5 py-2 text-[13px] text-[#8a4b12]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={submit}
        className="w-full rounded-xl bg-[#1c2b23] py-3 text-[14.5px] font-semibold text-[#f7f4ec]"
      >
        {submitLabel || "Start tracking"}
      </button>
    </Card>
  );
};

export default BillsForm;
