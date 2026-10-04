import { BellRing } from "lucide-react";

import { useNow } from "../hooks/use-now";
import { diffDays, greeting, isoDay, money, monthKey } from "../lib/format";
import { computeMilestones } from "../lib/milestones";
import { isOverdue } from "../lib/recurring";
import { nextPayday, salaryStats } from "../lib/salary";
import type {
  IncomePromise,
  Insight,
  Loan,
  Recurring,
  Settings,
  Txn,
} from "../lib/types";
import DashboardHero from "./dashboard-hero";
import Milestones from "./milestones";
import NotesFeed from "./notes-feed";
import PromiseStrip from "./promise-strip";
import RecentList from "./recent-list";
import SalaryStrip from "./salary-strip";

const Dashboard = ({
  txns,
  loans,
  recurrings,
  promises,
  settings,
  insights,
  dismissed,
  onOpenQuick,
  onGo,
  onDismiss,
  onSnooze,
  onPromiseSettled,
}: {
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
  settings: Settings;
  insights: Insight[];
  dismissed: string[];
  onOpenQuick: (k: "expense" | "income" | "lend") => void;
  onGo: (go: string) => void;
  onDismiss: (id: string) => void;
  onSnooze: () => void;
  onPromiseSettled: (uid: string) => void;
}) => {
  const now = useNow();
  const today = isoDay(now);
  const mk = monthKey(today);
  const monthTx = txns.filter((t) => monthKey(t.date) === mk);
  let inc = 0;
  let exp = 0;
  for (const t of monthTx) {
    if (t.kind === "income") {
      inc += t.amount;
    } else {
      exp += t.amount;
    }
  }
  const left = inc - exp;
  const sal = salaryStats(txns);
  const expected = settings.expectedSalary || sal.avg || 0;
  const pay = nextPayday(settings.payday || 1, now);
  const daysToPay = diffDays(pay, today);
  const salIn = monthTx.some(
    (t) => t.kind === "income" && t.category === "Salary"
  );
  const recent = [...txns]
    .toSorted((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);
  const openLoans = loans.filter((l) => l.status === "open").length;
  const dueBills = recurrings.filter((r) => isOverdue(r, today, txns)).length;
  const milestones = computeMilestones({ loans, recurrings, settings, txns });
  const dismissedSet = new Set(dismissed);
  const visible = insights.filter((i) => !dismissedSet.has(i.id));
  const unread = visible.length;
  let intro: string;
  if (txns.length === 0) {
    intro = "I'm Pebble - I'll quietly keep an eye on things.";
  } else if (left >= 0) {
    intro = `Calm so far - ${money(left, settings.currency)} still with you this month.`;
  } else {
    intro = "A little over the line this month - we'll figure it out together.";
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 px-1 pt-1">
        <img
          src="/images/companion.png"
          alt="Pebble"
          className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-white"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[20px] leading-tight font-bold text-[#1c2b23]">
            {greeting(now)}, {settings.name || "friend"}.
          </p>
          <p className="truncate text-[13.5px] text-[#5b6b60]">{intro}</p>
        </div>
        <button
          type="button"
          onClick={() => onGo("insights")}
          className="relative shrink-0 rounded-full bg-white p-2.5 ring-1 ring-[#1c2b23]/10"
          aria-label="Notifications"
        >
          <BellRing size={18} className="text-[#1c2b23]" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#b3541e] px-1 text-[12px] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </button>
      </div>

      <DashboardHero
        left={left}
        inc={inc}
        exp={exp}
        expected={expected}
        daysToPay={daysToPay}
        salIn={salIn}
        currency={settings.currency}
        monthName={now.toLocaleString("en-US", { month: "long" })}
        onQuick={onOpenQuick}
      />

      <SalaryStrip
        expected={expected}
        salIn={salIn}
        daysToPay={daysToPay}
        pay={pay}
        payday={settings.payday}
        currency={settings.currency}
        onLog={() => onOpenQuick("income")}
      />

      <PromiseStrip
        promises={promises}
        currency={settings.currency}
        onSettle={onPromiseSettled}
      />

      <NotesFeed
        items={visible.slice(0, 3)}
        unread={unread}
        onDismiss={onDismiss}
        onGo={onGo}
        onSnooze={onSnooze}
      />

      {openLoans > 0 || dueBills > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {dueBills > 0 ? (
            <button
              type="button"
              onClick={() => onGo("recurring")}
              className="rounded-3xl bg-[#fbeedd] p-4 text-left ring-1 ring-[#b3541e]/20"
            >
              <p className="font-display text-[22px] font-bold text-[#1c2b23]">
                {dueBills}
              </p>
              <p className="text-[12.5px] text-[#5b6b60]">
                bill{dueBills > 1 ? "s" : ""} due or overdue
              </p>
            </button>
          ) : null}
          {openLoans > 0 ? (
            <button
              type="button"
              onClick={() => onGo("lending")}
              className="rounded-3xl bg-[#eef5ec] p-4 text-left ring-1 ring-[#1e4d3a]/15"
            >
              <p className="font-display text-[22px] font-bold text-[#1c2b23]">
                {openLoans}
              </p>
              <p className="text-[12.5px] text-[#5b6b60]">
                open loan{openLoans > 1 ? "s" : ""} remembered
              </p>
            </button>
          ) : null}
        </div>
      ) : null}

      <RecentList
        recent={recent}
        currency={settings.currency}
        onSeeAll={() => onGo("transactions")}
      />

      <Milestones items={milestones} />

      <p className="pb-2 text-center text-[12px] text-[#8a978d]">
        Everything stays on this device · works fully offline · yours, always
      </p>
    </div>
  );
};

export default Dashboard;
