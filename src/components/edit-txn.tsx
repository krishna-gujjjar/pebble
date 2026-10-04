import { X } from "lucide-react";
import { useState } from "react";

import { parseAmount } from "../lib/format";
import type { Kind, Txn } from "../lib/types";
import { EXPENSE_CATS, INCOME_CATS } from "../lib/types";
import PaymentPicker from "./payment-picker";

const EditTxn = ({
  txn,
  currency,
  onClose,
  onSave,
}: {
  txn: Txn;
  currency: string;
  onClose: () => void;
  onSave: (t: Txn) => void;
}) => {
  const [kind, setKind] = useState<Kind>(txn.kind);
  const [amount, setAmount] = useState(String(txn.amount));
  const [category, setCategory] = useState(txn.category);
  const [note, setNote] = useState(txn.note);
  const [date, setDate] = useState(txn.date);
  const [payment, setPayment] = useState(txn.payment || "Cash");
  const [error, setError] = useState("");
  const cats = kind === "income" ? INCOME_CATS : EXPENSE_CATS;

  const save = () => {
    const v = parseAmount(amount);
    if (!v || v <= 0) {
      setError("Amount needs to be more than zero.");
      return;
    }
    if (!date) {
      setError("Pick a date for this entry.");
      return;
    }
    onSave({
      ...txn,
      amount: v,
      category,
      date,
      kind,
      note: note.trim() || category,
      payment,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[#1c2b23]/45"
      />
      <div className="relative w-full max-w-[480px] rounded-t-[28px] bg-[#faf7ef] p-5 pb-8 sm:rounded-[28px]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#1c2b23]/15" />
        <div className="flex items-center justify-between">
          <p className="font-display text-[18px] font-bold text-[#1c2b23]">
            Edit entry
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white p-2 ring-1 ring-[#1c2b23]/10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#efe9d8] p-1.5">
          {(["expense", "income"] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => {
                setKind(k);
                if (!cats.includes(category)) {
                  setCategory(k === "income" ? "Salary" : "Groceries");
                }
              }}
              className={`rounded-xl py-2.5 text-[14px] font-semibold capitalize ${kind === k ? "bg-[#1c2b23] text-[#f7f4ec]" : "text-[#5b6b60]"}`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-[#1c2b23]/10">
          <label className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase">
            Amount ({currency})
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="font-display mt-1 w-full bg-transparent text-[34px] font-bold text-[#1c2b23] outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${category === c ? "bg-[#1c2b23] text-[#f7f4ec]" : "bg-white text-[#3d4b42] ring-1 ring-[#1c2b23]/10"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2.5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
          />
        </div>
        <PaymentPicker value={payment} onChange={setPayment} />
        {error ? (
          <p className="mt-3 rounded-2xl bg-[#fbeedf] px-4 py-2.5 text-[13.5px] text-[#8a4b12]">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={save}
          className="mt-4 w-full rounded-2xl bg-[#1c2b23] py-3.5 text-[15.5px] font-semibold text-[#f7f4ec]"
        >
          Save changes
        </button>
      </div>
    </div>
  );
};

export default EditTxn;
