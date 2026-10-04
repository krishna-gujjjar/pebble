import { ShieldCheck } from "lucide-react";

import type { BackupFile } from "../lib/store";
import type {
  IncomePromise,
  Loan,
  Recurring,
  Settings,
  Txn,
} from "../lib/types";
import CareAbout from "./care-about";
import CareBudgets from "./care-budgets";
import CareData from "./care-data";
import { Card, SectionTitle } from "./ui";

const Care = ({
  settings,
  txns,
  loans,
  recurrings,
  promises,
  onSettings,
  onRestore,
  onWipe,
}: {
  settings: Settings;
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
  onSettings: (s: Settings) => void;
  onRestore: (b: BackupFile) => void;
  onWipe: () => void;
}) => (
  <div className="space-y-4">
    <Card dark className="flex items-start gap-3.5 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7f4ec]/10">
        <ShieldCheck size={20} className="text-[#f7f4ec]" />
      </span>
      <div>
        <p className="font-display text-[16px] font-semibold text-[#f7f4ec]">
          Private by design
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#f7f4ec]/70">
          No accounts. No sign-ins. No cloud, no internet needed - everything
          lives on this device and works fully offline. Backups are files you
          hold, not servers anyone controls.
        </p>
      </div>
    </Card>

    <SectionTitle
      title="About you"
      sub="Just enough to make observations personal."
    />
    <CareAbout settings={settings} onSave={onSettings} />

    <SectionTitle
      title="Soft budgets"
      sub="Not limits - just tripwires that tap your shoulder."
    />
    <CareBudgets settings={settings} txns={txns} onSave={onSettings} />

    <SectionTitle
      title="Your data, your hands"
      sub="One-tap backup files. Restore anywhere."
    />
    <CareData
      settings={settings}
      txns={txns}
      loans={loans}
      recurrings={recurrings}
      promises={promises}
      onRestore={onRestore}
      onWipe={onWipe}
      onSettings={onSettings}
    />

    <p className="pb-2 text-center text-[12px] text-[#8a978d]">
      Pebble · a financial companion, not another tracker · offline by design
    </p>
  </div>
);

export default Care;
