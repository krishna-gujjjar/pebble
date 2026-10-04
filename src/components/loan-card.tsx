import { money, prettyDate } from "../lib/format";
import type { Loan } from "../lib/types";
import LoanActions from "./loan-actions";
import { Bar, Card } from "./ui";

const LoanCard = ({
  loan,
  currency,
  onRepay,
  onSettle,
  onDelete,
}: {
  loan: Loan;
  currency: string;
  onRepay: (uid: string, amt: number) => void;
  onSettle: (uid: string) => void;
  onDelete: (uid: string) => void;
}) => {
  const remaining = Math.max(0, loan.amount - loan.repaid);
  const pct = loan.amount > 0 ? (loan.repaid / loan.amount) * 100 : 0;
  const settled = loan.status === "settled";
  const lent = loan.direction === "lent";
  const toneBg = lent
    ? "bg-[#eef5ec] text-[#1e4d3a]"
    : "bg-[#fbf3e3] text-[#8a4b12]";
  const moneyTone = lent ? "text-[#1e4d3a]" : "text-[#b3541e]";
  let barColor = "#b97f1f";
  if (settled) {
    barColor = "#8a978d";
  } else if (lent) {
    barColor = "#1e4d3a";
  }
  let meta = `${lent ? "You lent" : "You borrowed"} ${money(loan.amount, currency)} · ${prettyDate(loan.date)}`;
  if (loan.dueDate && loan.dueDate !== loan.date) {
    meta += ` · due ${prettyDate(loan.dueDate)}`;
  }
  if (loan.note) {
    meta += ` · ${loan.note}`;
  }

  return (
    <Card className={`p-4 ${settled ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <span
          className={`font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[18px] font-bold ${toneBg}`}
        >
          {(loan.person || "?").trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display truncate text-[16px] font-semibold text-[#1c2b23]">
              {loan.person}
            </p>
            <p className={`shrink-0 text-[15px] font-bold ${moneyTone}`}>
              {money(remaining, currency)}{" "}
              <span className="text-[12px] font-medium text-[#8a978d]">
                left
              </span>
            </p>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-[#5b6b60]">{meta}</p>
          <div className="mt-2.5">
            <Bar pct={pct} color={barColor} />
          </div>
          <p className="mt-1 text-[12px] text-[#8a978d]">
            {settled
              ? "Settled - nicely handled."
              : `${money(loan.repaid, currency)} of ${money(loan.amount, currency)} returned`}
          </p>
          <LoanActions
            loan={loan}
            onRepay={onRepay}
            onSettle={onSettle}
            onDelete={onDelete}
          />
        </div>
      </div>
    </Card>
  );
};

export default LoanCard;
