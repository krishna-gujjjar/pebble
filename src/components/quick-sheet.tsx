import { X } from "lucide-react";
import { div as MotionDiv } from "motion/react-m";
import { useRef, useState } from "react";

import { isoDay, parseAmount } from "../lib/format";
import { uid } from "../lib/store";
import type { Kind, LoanDirection, Txn } from "../lib/types";
import EntryFields from "./entry-fields";
import KindTabs from "./kind-tabs";
import LendFields from "./lend-fields";

export interface QuickSave {
  txn?: Txn;
  loan?: LoanPayload;
}

export interface LoanPayload {
  amount: number;
  direction: LoanDirection;
  person: string;
  note: string;
  date: string;
  dueDate: string;
}

const QuickSheet = ({
  initialKind,
  txns,
  persons,
  currency,
  onClose,
  onSave,
}: {
  initialKind: Kind | "lend";
  txns: Txn[];
  persons: string[];
  currency: string;
  onClose: () => void;
  onSave: (s: QuickSave) => void;
}) => {
  const [kind, setKind] = useState<Kind | "lend">(initialKind);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [note, setNote] = useState("");
  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<LoanDirection>("lent");
  const [date, setDate] = useState(() => isoDay(new Date()));
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const payment = useRef("Cash");

  const pickKind = (next: Kind | "lend") => {
    setKind(next);
    setCategory(next === "income" ? "Salary" : "Groceries");
  };

  const save = () => {
    const amt = parseAmount(amount);
    if (!amt || amt <= 0) {
      setError("Add an amount first - even a rough one is fine.");
      return;
    }
    if (kind === "lend") {
      if (!person.trim()) {
        setError("Who is this with? A first name is enough.");
        return;
      }
      onSave({
        loan: {
          amount: amt,
          date,
          direction,
          dueDate,
          note:
            direction === "lent"
              ? `Lent to ${person.trim()}`
              : `Borrowed from ${person.trim()}`,
          person: person.trim(),
        },
      });
    } else {
      onSave({
        txn: {
          amount: amt,
          category,
          createdAt: new Date().toISOString(),
          date,
          // date: isoDay(new Date()),
          kind,
          note: note.trim() || category,
          payment: payment.current,
          uid: uid("t"),
        },
      });
    }
    onClose();
  };

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
        className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-[#faf7ef] p-5 pb-8 sm:rounded-[28px]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#1c2b23]/15" />
        <div className="flex items-center justify-between">
          <p className="font-display text-[19px] font-bold text-[#1c2b23]">
            A few seconds, that&apos;s all
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
        <KindTabs kind={kind} onChange={pickKind} />
        {kind === "lend" ? (
          <LendFields
            amount={amount}
            onAmount={setAmount}
            currency={currency}
            direction={direction}
            onDirection={setDirection}
            person={person}
            onPerson={setPerson}
            date={date}
            onDate={setDate}
            dueDate={dueDate}
            onDueDate={setDueDate}
            persons={persons}
            onQuickSave={save}
          />
        ) : (
          <EntryFields
            kind={kind}
            txns={txns}
            currency={currency}
            amount={amount}
            onAmount={setAmount}
            category={category}
            onCategory={setCategory}
            date={date}
            onDate={setDate}
            note={note}
            onNote={setNote}
            onPickPayment={(p) => {
              payment.current = p;
            }}
            onQuickSave={save}
          />
        )}
        {error ? (
          <p className="mt-3 rounded-2xl bg-[#fbeedf] px-4 py-2.5 text-[13.5px] text-[#8a4b12]">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={save}
          className="mt-4 w-full rounded-2xl bg-[#1c2b23] py-4 text-[16px] font-semibold text-[#f7f4ec] shadow-lg transition-transform active:scale-[0.99]"
        >
          Save - done in seconds
        </button>
        <p className="mt-2.5 text-center text-[12.5px] text-[#8a978d]">
          Saved on this device only. Nothing leaves without you saying so.
        </p>
      </MotionDiv>
    </div>
  );
};

export default QuickSheet;
