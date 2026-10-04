import { useState } from "react";

import { parseAmount } from "../lib/format";
import type { Settings } from "../lib/types";
import { CURRENCIES } from "../lib/types";
import { Card } from "./ui";

interface AboutDraft {
  name: string;
  currency: string;
  payday: string;
  salary: string;
}

const draftFrom = (s: Settings): AboutDraft => ({
  currency: s.currency,
  name: s.name,
  payday: String(s.payday || 1),
  salary: String(s.expectedSalary || ""),
});

const CareAbout = ({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
}) => {
  const [draft, setDraft] = useState<AboutDraft | null>(null);
  const [msg, setMsg] = useState("");
  const values = draft ?? draftFrom(settings);

  const setField = (key: keyof AboutDraft, value: string) => {
    const base = draft ?? draftFrom(settings);
    setDraft({ ...base, [key]: value });
  };

  const save = () => {
    const p = Math.max(1, Math.min(28, Number(values.payday) || 1));
    onSave({
      ...settings,
      currency: values.currency,
      expectedSalary: parseAmount(values.salary),
      name: values.name.trim() || "Friend",
      payday: p,
    });
    setDraft(null);
    setMsg("Saved - Pebble will use this to watch more carefully.");
    setTimeout(() => setMsg(""), 2400);
  };

  const field =
    "mt-1 w-full rounded-xl bg-[#f6f2e8] px-3.5 py-2.5 text-[14.5px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]";
  const label =
    "text-[12px] font-semibold tracking-wide text-[#8a978d] uppercase";

  return (
    <Card className="space-y-3 p-4">
      <div>
        <label htmlFor="care-name" className={label}>
          What should Pebble call you?
        </label>
        <input
          id="care-name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Friend"
          className={field}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="care-currency" className={label}>
            Currency
          </label>
          <select
            id="care-currency"
            value={values.currency}
            onChange={(e) => setField("currency", e.target.value)}
            className={field}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="care-payday" className={label}>
            Payday (day)
          </label>
          <input
            id="care-payday"
            value={values.payday}
            onChange={(e) => setField("payday", e.target.value)}
            inputMode="numeric"
            placeholder="1"
            className={field}
          />
        </div>
      </div>
      <div>
        <label htmlFor="care-salary" className={label}>
          Usual take-home pay (optional)
        </label>
        <input
          id="care-salary"
          value={values.salary}
          onChange={(e) => setField("salary", e.target.value)}
          inputMode="decimal"
          placeholder="e.g. 3450"
          className={field}
        />
        <p className="mt-1 text-[12px] text-[#8a978d]">
          If left blank, Pebble learns it from your salary entries.
        </p>
      </div>
      {msg ? (
        <p className="rounded-xl bg-[#eef5ec] px-3.5 py-2 text-[13px] font-medium text-[#1e4d3a]">
          {msg}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        className="w-full rounded-xl bg-[#1c2b23] py-3 text-[14.5px] font-semibold text-[#f7f4ec]"
      >
        Save preferences
      </button>
    </Card>
  );
};

export default CareAbout;
