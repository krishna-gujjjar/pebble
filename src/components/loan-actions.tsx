import { Check, Trash2 } from "lucide-react";
import { useState } from "react";

import { parseAmount } from "../lib/format";
import type { Loan } from "../lib/types";

const LoanActions = ({
  loan,
  onRepay,
  onSettle,
  onDelete,
}: {
  loan: Loan;
  onRepay: (uid: string, amt: number) => void;
  onSettle: (uid: string) => void;
  onDelete: (uid: string) => void;
}) => {
  const [repayOpen, setRepayOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const remaining = Math.max(0, loan.amount - loan.repaid);
  const settled = loan.status === "settled";
  const backText = loan.direction === "lent" ? "Log repayment" : "Log payback";

  const submitRepay = () => {
    const v = parseAmount(amt);
    if (!v || v <= 0) {
      return;
    }
    onRepay(loan.uid, Math.min(v, remaining || v));
    setAmt("");
    setRepayOpen(false);
  };

  if (settled) {
    return (
      <button
        type="button"
        onClick={() => (confirmDel ? onDelete(loan.uid) : setConfirmDel(true))}
        onBlur={() => setConfirmDel(false)}
        className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] text-[#8a978d] ring-1 ring-[#1c2b23]/10"
      >
        <Trash2 size={12} />{" "}
        {confirmDel ? "Tap again to remove" : "Remove record"}
      </button>
    );
  }

  return (
    <div className="mt-3">
      {repayOpen ? (
        <div className="flex gap-2">
          <input
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            inputMode="decimal"
            placeholder={
              loan.direction === "lent" ? "Repaid amount" : "Paid back amount"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitRepay();
              }
            }}
            className="w-full rounded-xl bg-[#f6f2e8] px-3 py-2 text-[14px] ring-1 ring-[#1c2b23]/10 outline-none focus:ring-2 focus:ring-[#1e4d3a]"
          />
          <button
            type="button"
            onClick={submitRepay}
            className="shrink-0 rounded-xl bg-[#1c2b23] px-3.5 py-2 text-[13px] font-semibold text-[#f7f4ec]"
          >
            Log
          </button>
          <button
            type="button"
            onClick={() => setRepayOpen(false)}
            className="shrink-0 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-[#1c2b23]/10"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRepayOpen(true)}
            className="rounded-full bg-[#1c2b23] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#f7f4ec]"
          >
            {backText}
          </button>
          <button
            type="button"
            onClick={() => onSettle(loan.uid)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1e4d3a] ring-1 ring-[#1e4d3a]/25"
          >
            <Check size={13} /> Settle
          </button>
          <button
            type="button"
            onClick={() =>
              confirmDel ? onDelete(loan.uid) : setConfirmDel(true)
            }
            onBlur={() => setConfirmDel(false)}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ring-1 ${confirmDel ? "bg-[#b3541e] text-white ring-[#b3541e]" : "bg-white text-[#8a978d] ring-[#1c2b23]/10"}`}
          >
            <Trash2 size={13} /> {confirmDel ? "Sure?" : "Remove"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LoanActions;
