import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { money, prettyDate } from "../lib/format";
import type { Kind, Txn } from "../lib/types";
import { Card, Empty, Pill } from "./ui";

const kindIcon = (kind: Kind, payment: string) => {
  if (payment === "UPI") {
    return <Smartphone size={16} />;
  }
  if (payment === "Card") {
    return <CreditCard size={16} />;
  }
  if (payment === "Cash") {
    return <Banknote size={16} />;
  }
  return kind === "income" ? (
    <ArrowDownLeft size={16} />
  ) : (
    <ArrowUpRight size={16} />
  );
};

const categoryColor: Record<string, string> = {
  Dining: "bg-[#fff3e0] text-[#ef6c00]",
  Education: "bg-[#ede7f6] text-[#4527a0]",
  Fun: "bg-[#e8eaf6] text-[#283593]",
  Groceries: "bg-[#e8f5e9] text-[#2e7d32]",
  Health: "bg-[#ffebee] text-[#d32f2f]",
  Other: "bg-[#f5f5f5] text-[#616161]",
  Rent: "bg-[#fce4ec] text-[#c2185b]",
  Salary: "bg-[#e8f5e9] text-[#1b5e20]",
  Shopping: "bg-[#fff8e1] text-[#f9a825]",
  Subscriptions: "bg-[#f3e5f5] text-[#7b1fa2]",
  Transport: "bg-[#e3f2fd] text-[#1565c0]",
  Travel: "bg-[#e1f5fe] text-[#0277bd]",
  Utilities: "bg-[#e0f2f1] text-[#00695c]",
};

const Transactions = ({
  txns,
  currency,
  onDelete,
  onEdit,
  onNew,
}: {
  txns: Txn[];
  currency: string;
  onDelete: (uid: string) => void;
  onEdit: (t: Txn) => void;
  onNew: () => void;
}) => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [cat, setCat] = useState("All");
  const [confirmUid, setConfirmUid] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const cats = useMemo(
    () => ["All", ...new Set(txns.map((t) => t.category))].slice(0, 14),
    [txns]
  );

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      txns.filter((t) => {
        if (filter !== "all" && t.kind !== filter) {
          return false;
        }
        if (cat !== "All" && t.category !== cat) {
          return false;
        }
        if (!needle) {
          return true;
        }
        return `${t.note} ${t.category} ${t.amount} ${t.payment}`
          .toLowerCase()
          .includes(needle);
      }),
    [txns, filter, cat, needle]
  );

  const list = useMemo(
    () =>
      [...filtered]
        .toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 200),
    [filtered]
  );

  const totals = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const t of filtered) {
      if (t.kind === "expense") {
        exp += t.amount;
      } else {
        inc += t.amount;
      }
    }
    return { count: filtered.length, exp, inc };
  }, [filtered]);

  const groups = useMemo(() => {
    const map = new Map<string, Txn[]>();
    for (const t of list) {
      const g = map.get(t.date);
      if (g) {
        g.push(t);
      } else {
        map.set(t.date, [t]);
      }
    }
    return [...map.entries()];
  }, [list]);

  const selected = selectedUid ? txns.find((t) => t.uid === selectedUid) : null;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card dark className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-widest text-[#f7f4ec]/60 uppercase">
              Entries
            </p>
            <p className="font-display mt-1 text-[22px] font-bold text-[#f7f4ec]">
              {totals.count} transactions
            </p>
            <p className="mt-1 text-[12.5px] text-[#f7f4ec]/70">
              {totals.exp > 0 ? `${money(totals.exp, currency)} spent` : ""}{" "}
              {totals.exp > 0 && totals.inc > 0 ? "·" : ""}{" "}
              {totals.inc > 0 ? `${money(totals.inc, currency)} in` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-wide text-[#f7f4ec]/60 uppercase">
              Net this filter
            </p>
            <p
              className={`font-display mt-1 text-[20px] font-bold ${totals.inc - totals.exp >= 0 ? "text-[#a8d5a2]" : "text-[#f7c9a8]"}`}
            >
              {money(totals.inc - totals.exp, currency)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f7f4ec]/10 px-3.5 py-2.5">
          <Search size={14} className="shrink-0 text-[#f7f4ec]/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes, categories, amounts…"
            className="w-full bg-transparent text-[14px] text-[#f7f4ec] outline-none placeholder:text-[#f7f4ec]/50"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="rounded-full bg-[#f7f4ec]/15 px-2 py-0.5 text-[11px] text-[#f7f4ec]"
            >
              Clear
            </button>
          ) : null}
        </div>
      </Card>

      {/* Filters */}
      <div className="space-y-2.5 px-1">
        <div className="flex scrollbar-none gap-2 overflow-x-auto pb-1">
          <Pill active={filter === "all"} onClick={() => setFilter("all")}>
            Everything
          </Pill>
          <Pill
            active={filter === "expense"}
            onClick={() => setFilter("expense")}
          >
            Spending
          </Pill>
          <Pill
            active={filter === "income"}
            onClick={() => setFilter("income")}
          >
            Income
          </Pill>
        </div>
        <div className="flex scrollbar-none gap-1.5 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${cat === c ? "bg-[#1c2b23] text-[#f7f4ec]" : "bg-white text-[#5b6b60] ring-1 ring-[#1c2b23]/10"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <Empty
            title={
              txns.length === 0
                ? "A blank page, full of possibility"
                : "Nothing matches that search"
            }
            body={
              txns.length === 0
                ? "Your first entry takes seconds - after that, Pebble starts noticing patterns for you."
                : "Try a different word, or clear the filters to see everything again."
            }
            action={
              txns.length === 0 ? (
                <button
                  type="button"
                  onClick={onNew}
                  className="rounded-full bg-[#1c2b23] px-4 py-2 text-[13.5px] font-semibold text-[#f7f4ec]"
                >
                  Add your first entry
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setCat("All");
                    setFilter("all");
                  }}
                  className="rounded-full bg-[#1c2b23] px-4 py-2 text-[13.5px] font-semibold text-[#f7f4ec]"
                >
                  Clear filters
                </button>
              )
            }
          />
        </Card>
      ) : (
        groups.map(([date, items]) => {
          const dayExp = items
            .filter((t) => t.kind === "expense")
            .reduce((s, t) => s + t.amount, 0);
          const dayInc = items
            .filter((t) => t.kind === "income")
            .reduce((s, t) => s + t.amount, 0);
          return (
            <div key={date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[13px] font-semibold text-[#1c2b23]">
                  {prettyDate(date)}
                </p>
                <div className="flex gap-2 text-[11.5px]">
                  {dayExp > 0 ? (
                    <span className="rounded-full bg-[#f6f2e8] px-2 py-0.5 text-[#8a6b4a]">
                      {money(dayExp, currency)} out
                    </span>
                  ) : null}
                  {dayInc > 0 ? (
                    <span className="rounded-full bg-[#eef5ec] px-2 py-0.5 text-[#1e4d3a]">
                      {money(dayInc, currency)} in
                    </span>
                  ) : null}
                </div>
              </div>
              <Card className="divide-y divide-[#1c2b23]/6 overflow-hidden">
                {items.map((t) => {
                  const isSelected = selectedUid === t.uid;
                  const catStyle =
                    categoryColor[t.category] || categoryColor.Other;
                  return (
                    <div
                      key={t.uid}
                      onClick={() => setSelectedUid(isSelected ? null : t.uid)}
                      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${isSelected ? "bg-[#fbf7ea]" : "hover:bg-[#faf7ef]"} cursor-pointer`}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.kind === "income" ? "bg-[#eef5ec] text-[#1e4d3a]" : "bg-[#f6f2e8] text-[#5b6b60]"}`}
                      >
                        {kindIcon(t.kind, t.payment)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-medium text-[#1c2b23]">
                          {t.note || t.category}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${catStyle}`}
                          >
                            {t.category}
                          </span>
                          {t.payment ? (
                            <span className="text-[11px] text-[#8a978d]">
                              · {t.payment}
                            </span>
                          ) : null}
                          {t.loanUid ? (
                            <span className="rounded-full bg-[#e8eaf6] px-1.5 py-0.5 text-[10px] text-[#3949ab]">
                              Loan
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-display text-[15.5px] font-bold ${t.kind === "income" ? "text-[#1e4d3a]" : "text-[#1c2b23]"}`}
                        >
                          {t.kind === "income" ? "+" : "−"}
                          {money(t.amount, currency).replace("−", "")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8a978d]">
                          {prettyDate(t.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          );
        })
      )}
      {filtered.length > 200 ? (
        <p className="text-center text-[12px] text-[#8a978d]">
          Showing 200 most recent · search to find older
        </p>
      ) : null}

      {/* Detail bottom sheet for selected txn - now with delete */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-[#1c2b23]/40"
            onClick={() => setSelectedUid(null)}
          />
          <div className="animate-in slide-in-from-bottom relative w-full max-w-[520px] rounded-t-[28px] bg-[#faf7ef] p-5 pb-8 sm:rounded-[28px]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#1c2b23]/15" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[20px] font-bold text-[#1c2b23]">
                  {selected.note}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${categoryColor[selected.category] || categoryColor.Other}`}
                  >
                    {selected.category}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-[#1c2b23]/10">
                    {selected.payment} · {selected.kind}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-[#1c2b23]/10">
                    {prettyDate(selected.date)}
                  </span>
                </div>
              </div>
              <p
                className={`font-display text-[24px] font-bold ${selected.kind === "income" ? "text-[#1e4d3a]" : "text-[#1c2b23]"}`}
              >
                {selected.kind === "income" ? "+" : "−"}
                {money(selected.amount, currency).replace("−", "")}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onEdit(selected);
                  setSelectedUid(null);
                }}
                className="rounded-2xl bg-[#1c2b23] py-3 text-[14px] font-semibold text-[#f7f4ec]"
              >
                Edit entry
              </button>
              <button
                type="button"
                onClick={() => setSelectedUid(null)}
                className="rounded-2xl bg-white py-3 text-[14px] font-medium ring-1 ring-[#1c2b23]/10"
              >
                Close
              </button>
            </div>
            <div className="mt-3">
              {confirmUid === selected.uid ? (
                <div className="rounded-2xl bg-[#fbeedf] p-3">
                  <p className="text-[13px] font-medium text-[#8a4b12]">
                    Delete this entry? This cannot be undone.
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(selected.uid);
                        setConfirmUid("");
                        setSelectedUid(null);
                      }}
                      className="rounded-xl bg-[#b3541e] py-2.5 text-[13px] font-semibold text-white"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmUid("")}
                      className="rounded-xl bg-white py-2.5 text-[13px] font-medium ring-1 ring-[#1c2b23]/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmUid(selected.uid)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-[13px] font-medium text-[#8a978d] ring-1 ring-[#1c2b23]/10"
                >
                  <Trash2 size={14} /> Delete entry
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Transactions;
