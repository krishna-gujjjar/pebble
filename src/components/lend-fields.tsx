import type { LoanDirection } from "../lib/types";
import AmountField from "./amount-field";

const LendFields = ({
  amount,
  onAmount,
  currency,
  direction,
  onDirection,
  person,
  onPerson,
  date,
  onDate,
  dueDate,
  onDueDate,
  persons,
  onQuickSave,
}: {
  amount: string;
  onAmount: (v: string) => void;
  currency: string;
  direction: LoanDirection;
  onDirection: (d: LoanDirection) => void;
  person: string;
  onPerson: (p: string) => void;
  date: string;
  onDate: (d: string) => void;
  dueDate: string;
  onDueDate: (d: string) => void;
  persons: string[];
  onQuickSave: () => void;
}) => {
  const matches = (() => {
    const needle = person.toLowerCase().trim();
    if (!needle) {
      return [];
    }
    return [...new Set(persons)]
      .filter((p) => p.toLowerCase().includes(needle))
      .slice(0, 5);
  })();

  const field =
    "w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-[#1c2b23] ring-1 ring-[#1c2b23]/10 outline-none placeholder:text-[#9aa79d] focus:ring-2 focus:ring-[#1e4d3a]";

  return (
    <>
      <AmountField
        amount={amount}
        onAmount={onAmount}
        currency={currency}
        onEnter={onQuickSave}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["lent", "borrowed"] as const).map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => onDirection(d)}
            className={`rounded-2xl px-3 py-3 text-[14px] font-semibold ring-1 transition-all ${direction === d ? "bg-[#1e4d3a] text-white ring-[#1e4d3a]" : "bg-white text-[#3d4b42] ring-[#1c2b23]/10"}`}
          >
            {d === "lent" ? "I lent" : "I borrowed"}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2.5">
        <input
          value={person}
          onChange={(e) => onPerson(e.target.value)}
          placeholder="With whom? e.g. Alex"
          className={field}
        />
        {matches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {matches.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => onPerson(p)}
                className="rounded-full bg-[#efe9d8] px-3 py-1.5 text-[12.5px] text-[#5b6b60] hover:bg-[#e4dcc4]"
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="lend-when"
              className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase"
            >
              When
            </label>
            <input
              id="lend-when"
              type="date"
              value={date}
              onChange={(e) => onDate(e.target.value)}
              className={`mt-1 ${field}`}
            />
          </div>
          <div>
            <label
              htmlFor="lend-due"
              className="text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase"
            >
              Due back (optional)
            </label>
            <input
              id="lend-due"
              type="date"
              value={dueDate}
              onChange={(e) => onDueDate(e.target.value)}
              className={`mt-1 ${field}`}
            />
          </div>
        </div>
        <p className="px-1 text-[12.5px] text-[#8a978d]">
          {direction === "lent"
            ? "Money leaving your pocket will appear in Entries as an expense."
            : "Money coming to you will appear in Entries as income."}
        </p>
      </div>
    </>
  );
};

export default LendFields;
