import { salaryStats } from "./salary";
import type { Loan, Milestone, Recurring, Settings, Txn } from "./types";

export const computeMilestones = ({
  txns,
  loans,
  recurrings,
  settings,
}: {
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  settings: Settings;
}): Milestone[] => {
  const exp = txns.filter((t) => t.kind === "expense");
  const inc = txns.filter((t) => t.kind === "income");
  const totalIn = inc.reduce((s, t) => s + t.amount, 0);
  const totalOut = exp.reduce((s, t) => s + t.amount, 0);
  const settled = loans.filter((l) => l.status === "settled").length;
  const saved = totalIn - totalOut;
  const expected = settings.expectedSalary || salaryStats(txns).avg || 1;
  const activeBills = recurrings.filter((r) => r.active).length;
  return [
    {
      body: "Record 10 entries",
      id: "m-first",
      progress: Math.min(1, txns.length / 10),
      title: "First steps",
      unlocked: txns.length >= 10,
    },
    {
      body: "Record 50 entries",
      id: "m-observer",
      progress: Math.min(1, txns.length / 50),
      title: "Careful observer",
      unlocked: txns.length >= 50,
    },
    {
      body: "Keep 20% of income",
      id: "m-saver",
      progress: totalIn > 0 ? Math.min(1, saved / totalIn / 0.2) : 0,
      title: "Quiet saver",
      unlocked: totalIn > 0 && saved / totalIn >= 0.2,
    },
    {
      body: "Save a full month of pay",
      id: "m-buffer",
      progress: Math.min(1, saved / expected),
      title: "One-month buffer",
      unlocked: saved >= expected,
    },
    {
      body: "Settle a loan",
      id: "m-settler",
      progress: Math.min(1, settled),
      title: "Square & fair",
      unlocked: settled >= 1,
    },
    {
      body: "Track 3 recurring bills",
      id: "m-planner",
      progress: Math.min(1, activeBills / 3),
      title: "Bill whisperer",
      unlocked: activeBills >= 3,
    },
  ];
};
