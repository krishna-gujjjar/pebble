import { CloudOff, Download, FileUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { isoDay } from "../lib/format";
import { buildBackup, parseBackup } from "../lib/store";
import type { BackupFile } from "../lib/store";
import type {
  IncomePromise,
  Loan,
  Recurring,
  Settings,
  Txn,
} from "../lib/types";
import { Card } from "./ui";

const CareData = ({
  settings,
  txns,
  loans,
  recurrings,
  promises,
  onRestore,
  onWipe,
  onSettings,
}: {
  settings: Settings;
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
  onRestore: (b: BackupFile) => void;
  onWipe: () => void;
  onSettings: (s: Settings) => void;
}) => {
  const [msg, setMsg] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string, ms = 2600) => {
    setMsg(m);
    setTimeout(() => setMsg(""), ms);
  };

  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          buildBackup(settings, txns, loans, recurrings, promises),
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pebble-backup-${isoDay(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onSettings({ ...settings, lastBackupAt: new Date().toISOString() });
    flash("Backup downloaded - keep it somewhere safe. It is yours.");
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      return;
    }
    try {
      const text = await f.text();
      const b = parseBackup(text);
      onRestore(b);
      flash(`Restored ${b.transactions.length} entries - welcome back.`, 3000);
    } catch (error) {
      flash(
        error instanceof Error ? error.message : "Could not read that file.",
        3000
      );
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2.5">
      <Card className="space-y-2.5 p-4">
        <button
          type="button"
          onClick={download}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e4d3a] py-3 text-[14.5px] font-semibold text-white"
        >
          <Download size={16} /> Download backup file
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[14.5px] font-semibold text-[#1c2b23] ring-1 ring-[#1c2b23]/15"
        >
          <FileUp size={16} /> Restore from file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
        />
        <p className="text-center text-[12.5px] text-[#8a978d]">
          {settings.lastBackupAt
            ? `Last backup ${new Date(settings.lastBackupAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })} · `
            : ""}
          {txns.length} entries · {loans.length} loans · {recurrings.length}{" "}
          recurrings · {promises.length} expected payments
        </p>
        {msg ? (
          <p className="rounded-xl bg-[#eef5ec] px-3.5 py-2.5 text-center text-[13px] font-medium text-[#1e4d3a]">
            {msg}
          </p>
        ) : null}
      </Card>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <CloudOff size={18} className="mt-0.5 shrink-0 text-[#8a978d]" />
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[#1c2b23]">
              Start fresh on this device?
            </p>
            <p className="mt-0.5 text-[12.5px] text-[#5b6b60]">
              Removes everything stored here. Download a backup first if any of
              it matters to you.
            </p>
            <button
              type="button"
              onClick={() => (confirmWipe ? onWipe() : setConfirmWipe(true))}
              onBlur={() => setConfirmWipe(false)}
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ${confirmWipe ? "bg-[#b3541e] text-white ring-[#b3541e]" : "bg-white text-[#b3541e] ring-[#b3541e]/30"}`}
            >
              <Trash2 size={14} />{" "}
              {confirmWipe
                ? "Tap again - really erase everything"
                : "Erase all local data"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CareData;
