import { cardBillLabel } from "../lib/card";
import type { FinAction } from "../lib/finance-reducer";
import { isoDay } from "../lib/format";
import type { RecRecord } from "../lib/ops";
import type { Txn } from "../lib/types";

export type ActFn = (a: FinAction, msg?: string) => void;

export interface ActionDeps {
  act: ActFn;
  dismissed: string[];
}

export interface CandidateRec {
  amount: number;
  category: string;
  title: string;
}

export const makeActions = ({ act, dismissed }: ActionDeps) => {
  const addRecurring = (f: RecRecord) =>
    act({ f, type: "add-rec" }, "Pebble will watch that date for you.");
  const updateRecurring = (uid: string, f: Partial<RecRecord>) =>
    act({ f, type: "update-rec", uid }, "Bill updated.");
  const trackCandidate = (c: CandidateRec) =>
    addRecurring({
      amount: c.amount,
      category: c.category,
      frequency: "monthly",
      nextDue: isoDay(new Date(Date.now() + 30 * 86_400_000)),
      title: c.title,
    });
  return {
    addRecurring,
    deleteLoan: (uidV: string) =>
      act({ type: "delete-loan", uid: uidV }, "Loan and its entries removed."),
    deleteRecurring: (uidV: string) =>
      act({ type: "delete-rec", uid: uidV }, "Bill removed from watch."),
    deleteTxn: (uidV: string) =>
      act({ type: "delete-txn", uid: uidV }, "Entry removed."),
    dismiss: (id: string) =>
      act({
        ids: dismissed.includes(id) ? dismissed : [...dismissed, id],
        type: "set-dismissed",
      }),
    dismissAll: (ids: string[]) => act({ ids, type: "set-dismissed" }),
    paidRecurring: (uidV: string) =>
      act(
        { type: "pay-rec", uid: uidV },
        "Paid - logged, and the next date is set."
      ),
    repayLoan: (uidV: string, amt: number) =>
      act(
        { amt, type: "repay-loan", uid: uidV },
        "Repayment logged - and your entries stay true."
      ),
    settleLoan: (uidV: string) =>
      act(
        { type: "settle-loan", uid: uidV },
        "Settled. Friendships stay light."
      ),
    settlePromise: (uidV: string) =>
      act({ type: "settle-promise", uid: uidV }, "Received - cleared. Lovely."),
    toggleRecurring: (uidV: string) => act({ type: "toggle-rec", uid: uidV }),
    trackCandidate,
    trackCardBill: (amount: number, due: string) =>
      act(
        {
          f: {
            amount,
            card: true,
            category: "Other",
            frequency: "monthly",
            nextDue: due || isoDay(new Date()),
            title: cardBillLabel,
          },
          type: "add-rec",
        },
        "Watching the card bill - settling it won't log any spending."
      ),
    updateRecurring,
    updateTxn: (t: Txn) => act({ txn: t, type: "update-txn" }, "Updated."),
  };
};

export type FinanceActions = ReturnType<typeof makeActions>;
