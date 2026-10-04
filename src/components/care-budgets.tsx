import { useState } from "react";

import { isoDay, money, parseAmount } from "../lib/format";
import type { Settings, Txn } from "../lib/types";
import { EXPENSE_CATS } from "../lib/types";
import { Bar, Card } from "./ui";

const SKIP = new Set(["Rent", "Other", "Education", "Travel"]);

const CareBudgets = ({
  settings,
  txns,
  onSave,
}: {
  settings: Settings;
  txns: Txn[];
  onSave: (s: Settings) => void;
}) => {
  const [budgets, setBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EXPENSE_CATS.map((c) => [
        c,
        settings.budgets?.[c] ? String(settings.budgets[c]) : "",
      ])
    )
  );
  const [msg, setMsg] = useState("");
  const mk = isoDay(new Date()).slice(0, 7);

  const spentBy = (() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (t.kind === "expense" && (t.date || "").slice(0, 7) === mk) {
        m.set(t.category, (m.get(t.category) || 0) + t.amount);
      }
    }
    return m;
  })();

  const save = () => {
    const b: Record<string, number> = {};
    for (const [k, v] of Object.entries(budgets)) {
      const n = parseAmount(v);
      if (n > 0) {
        b[k] = n;
      }
    }
    onSave({ ...settings, budgets: b });
    setMsg("Budgets saved - quiet tripwires in place.");
    setTimeout(() => setMsg(""), 2400);
  };

  const cats = EXPENSE_CATS.filter((c) => !SKIP.has(c));
  return (
    <Card className="space-y-3 p-4">
      {cats.map((c) => {
        const spent = spentBy.get(c) || 0;
        const limit = parseAmount(budgets[c] || "");
        let barColor = "#1e4d3a";
        if (limit > 0 && spent / limit >= 1) {
          barColor = "#b3541e";
        } else if (limit > 0 && spent / limit >= 0.8) {
          barColor = "#b97f1f";
        }
        return (
          <div key={c}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-medium text-[#3d4b42]">
                {c}
              </span>
              <div className="flex items-center gap-2">
                {limit > 0 ? (
                  <span className="text-[12px] text-[#8a978d]">
                    {money(spent, settings.currency)} /{" "}
                    {money(limit, settings.currency)}
                  </span>
                ) : null}
                <input
                  value={budgets[c] || ""}
                  onChange={(e) =>
                    setBudgets((b) => ({ ...b, [c]: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="No budget"
                  className="w-24 rounded-lg bg-[#f6f2e8] px-2.5 py-1.5 text-right text-[13px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
                />
              </div>
            </div>
            {limit > 0 ? (
              <Bar pct={(spent / limit) * 100} color={barColor} />
            ) : null}
          </div>
        );
      })}
      {msg ? (
        <p className="rounded-xl bg-[#eef5ec] px-3.5 py-2 text-[13px] font-medium text-[#1e4d3a]">
          {msg}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        className="w-full rounded-xl bg-white py-2.5 text-[14px] font-semibold text-[#1c2b23] ring-1 ring-[#1c2b23]/15"
      >
        Save budgets
      </button>
    </Card>
  );
};

export default CareBudgets;
