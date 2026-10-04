import { useState } from "react";

import { detectRecurringCandidates } from "../lib/analytics";
import type { FinAction } from "../lib/finance-reducer";
import { computeInsights } from "../lib/insights";
import { buildBriefing } from "../lib/insights-briefing";
import type { LoanRecord } from "../lib/ops";
import { makePromise, shouldPromptIncome } from "../lib/promises";
import { LS, defaultSettings, saveJSON } from "../lib/store";
import type { BackupFile } from "../lib/store";
import type { Txn } from "../lib/types";
import { makeActions } from "./finance-actions";
import { useFinanceState } from "./use-finance-state";
import { useToast } from "./use-toast";

export interface QuickSave {
  txn?: Txn;
  loan?: LoanRecord;
}

export interface Shortfall {
  entry: Txn;
  expected: number;
}

export const useFinance = () => {
  const { booted, dispatch, setWelcome, state, welcome } = useFinanceState();
  const { txns, loans, recurrings, promises, settings, dismissed } = state;
  const [shortfall, setShortfall] = useState<Shortfall | null>(null);
  const { say, toast } = useToast();
  const now = new Date();

  const act = (a: FinAction, msg?: string) => {
    dispatch(a);
    if (msg) {
      say(msg);
    }
  };

  const {
    addRecurring,
    updateRecurring,
    deleteLoan,
    deleteRecurring,
    deleteTxn,
    dismiss,
    dismissAll,
    paidRecurring,
    repayLoan,
    settleLoan,
    settlePromise,
    toggleRecurring,
    trackCandidate,
    trackCardBill,
    updateTxn,
  } = makeActions({ act, dismissed });

  const saveQuick = (q: QuickSave) => {
    if (q.txn) {
      act(
        { txn: q.txn, type: "add-txn" },
        q.txn.kind === "income"
          ? "Income noted - nicely done."
          : "Saved. Took seconds, as promised."
      );
      if (
        shouldPromptIncome(q.txn, settings.expectedSalary, settings.incomeAcks)
      ) {
        setShortfall({ entry: q.txn, expected: settings.expectedSalary });
      }
    } else if (q.loan) {
      act(
        { opts: q.loan, type: "add-loan" },
        "Logged - and it's now in your entries too."
      );
    }
  };

  const answerLater = (total: number, due: string) => {
    if (!shortfall) {
      return;
    }
    const p = makePromise(shortfall.entry, total || shortfall.expected, due);
    if (p.expected > shortfall.entry.amount) {
      act({ p, type: "add-promise" }, "Watching for the rest.");
    } else {
      say("Noted.");
    }
    act({
      category: shortfall.entry.category,
      date: shortfall.entry.date,
      type: "ack",
    });
    setShortfall(null);
  };

  const answerNoMore = () => {
    if (!shortfall) {
      return;
    }
    act(
      {
        category: shortfall.entry.category,
        date: shortfall.entry.date,
        type: "ack",
      },
      "That's all - noted."
    );
    setShortfall(null);
  };

  const closeShortfall = () => setShortfall(null);

  const restoreBackup = (b: BackupFile) => {
    act({
      loans: b.loans || [],
      promises: b.promises || [],
      recurrings: b.recurrings || [],
      settings: { ...defaultSettings(), ...b.settings },
      txns: b.transactions || [],
      type: "replace",
    });
    setShortfall(null);
    say("Restored - welcome back.");
  };

  const wipeAll = () => {
    act({ type: "wipe" });
    for (const k of [
      LS.txns,
      LS.loans,
      LS.recurrings,
      LS.promises,
      LS.settings,
      LS.dismissed,
    ]) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* noop */
      }
    }
    saveJSON(LS.seeded, "1");
    say("Fresh start. Be gentle with yourself.");
  };

  const ctx = { loans, now, promises, recurrings, settings, txns };
  const insights = computeInsights(ctx);
  const briefing = buildBriefing(ctx);
  const tracked = new Set(recurrings.map((r) => r.title.toLowerCase()));
  const candidates = detectRecurringCandidates(txns).filter(
    (c) => !tracked.has(c.title.toLowerCase())
  );

  return {
    booted,
    briefing,
    candidates,
    dismissed,
    handleAddRecurring: addRecurring,
    handleAnswerLater: answerLater,
    handleAnswerNoMore: answerNoMore,
    handleCloseShortfall: closeShortfall,
    handleCloseWelcome: () => setWelcome(false),
    handleDeleteLoan: deleteLoan,
    handleDeleteRecurring: deleteRecurring,
    handleDeleteTxn: deleteTxn,
    handleDismiss: dismiss,
    handleDismissAll: dismissAll,
    handlePaidRecurring: paidRecurring,
    handleRepayLoan: repayLoan,
    handleSaveQuick: saveQuick,
    handleSettleLoan: settleLoan,
    handleSettlePromise: settlePromise,
    handleToggleRecurring: toggleRecurring,
    handleTrackCandidate: trackCandidate,
    handleTrackCardBill: trackCardBill,
    handleUpdateRecurring: updateRecurring,
    handleUpdateSettings: (s: typeof settings) =>
      act({ s, type: "set-settings" }),
    handleUpdateTxn: updateTxn,
    insights,
    loans,
    now,
    promises,
    recurrings,
    restoreBackup,
    say,
    settings,
    shortfall,
    toast,
    txns,
    welcome,
    wipeAll,
  };
};
