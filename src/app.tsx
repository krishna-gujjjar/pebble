import { Plus } from "lucide-react";
import { useState } from "react";

import AppBody from "./components/app-body";
import AppHeader from "./components/app-header";
import BootSplash from "./components/boot-splash";
import BottomNav from "./components/bottom-nav";
import EditTxn from "./components/edit-txn";
import QuickAdd from "./components/quick-add";
import ShortfallDialog from "./components/shortfall-dialog";
import Toast from "./components/toast";
import WelcomeOverlay from "./components/welcome-overlay";
import { useFinance } from "./hooks/use-finance";
import { parseGo } from "./lib/go-actions";
import type { Tab } from "./lib/tabs";
import type { Txn } from "./lib/types";

const App = () => {
  const fin = useFinance();
  const [tab, setTab] = useState<Tab>("home");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickKind, setQuickKind] = useState<"expense" | "income" | "lend">(
    "expense"
  );
  const [editing, setEditing] = useState<Txn | null>(null);
  const [snoozed, setSnoozed] = useState(false);

  const persons = [
    ...new Set(
      fin.loans.flatMap((l) => (l.person.trim() ? [l.person.trim()] : []))
    ),
  ];
  const dismissedSet = new Set(fin.dismissed);
  const unread = fin.insights.filter((i) => !dismissedSet.has(i.id)).length;

  const openQuick = (kind: "expense" | "income" | "lend") => {
    setQuickKind(kind);
    setQuickOpen(true);
  };

  const go = (dest: string) => {
    const action = parseGo(dest);
    if (action.kind === "promise-settle") {
      fin.handleSettlePromise(action.uid);
      return;
    }
    if (action.kind === "quick") {
      openQuick(action.quick);
      return;
    }
    if (action.kind === "card-bill") {
      fin.handleTrackCardBill(action.amount, action.due);
      setTab("recurring");
      return;
    }
    if (action.kind === "tab") {
      setTab(action.tab);
      window.scrollTo({ behavior: "smooth", top: 0 });
    }
  };

  const visible = snoozed ? [] : fin.insights;
  const goHome = () => setTab("home");

  return (
    <div className="font-body min-h-screen bg-[#f4f0e4] text-[#1c2b23]">
      <AppHeader tab={tab} notes={unread} onGo={go} />
      <main className="mx-auto max-w-180 px-4 pt-4 pb-32 md:pb-16">
        {fin.booted ? (
          <AppBody
            tab={tab}
            visible={visible}
            txns={fin.txns}
            loans={fin.loans}
            recurrings={fin.recurrings}
            promises={fin.promises}
            settings={fin.settings}
            dismissed={fin.dismissed}
            candidates={fin.candidates}
            briefing={fin.briefing}
            onGo={go}
            onOpenQuick={openQuick}
            onSnooze={() => {
              setSnoozed(true);
              fin.say("Quiet it is. I'll still keep watch.");
            }}
            onEdit={setEditing}
            onDismiss={fin.handleDismiss}
            onDismissAll={fin.handleDismissAll}
            onSettlePromise={fin.handleSettlePromise}
            onDeleteTxn={fin.handleDeleteTxn}
            onRepayLoan={fin.handleRepayLoan}
            onSettleLoan={fin.handleSettleLoan}
            onDeleteLoan={fin.handleDeleteLoan}
            onPaidRecurring={fin.handlePaidRecurring}
            onToggleRecurring={fin.handleToggleRecurring}
            onDeleteRecurring={fin.handleDeleteRecurring}
            onAddRecurring={fin.handleAddRecurring}
            onUpdateRecurring={fin.handleUpdateRecurring}
            onTrackCandidate={fin.handleTrackCandidate}
            onSettings={fin.handleUpdateSettings}
            onRestore={(b) => {
              fin.restoreBackup(b);
              goHome();
            }}
            onWipe={() => {
              fin.wipeAll();
              goHome();
            }}
          />
        ) : (
          <BootSplash />
        )}
      </main>
      <BottomNav tab={tab} onGo={go} />
      <button
        type="button"
        onClick={() => openQuick("expense")}
        aria-label="Add entry"
        className="fixed right-4 bottom-[5.2rem] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1c2b23] text-[#f7f4ec] shadow-xl transition-transform active:scale-90 md:right-8 md:bottom-8"
      >
        <Plus size={24} />
      </button>
      <QuickAdd
        open={quickOpen}
        initialKind={quickKind}
        txns={fin.txns}
        persons={persons}
        currency={fin.settings.currency}
        onClose={() => setQuickOpen(false)}
        onSave={fin.handleSaveQuick}
      />
      {editing ? (
        <EditTxn
          txn={editing}
          currency={fin.settings.currency}
          onClose={() => setEditing(null)}
          onSave={fin.handleUpdateTxn}
        />
      ) : null}
      <ShortfallDialog
        shortfall={fin.shortfall}
        currency={fin.settings.currency}
        onLater={fin.handleAnswerLater}
        onNoMore={fin.handleAnswerNoMore}
        onClose={fin.handleCloseShortfall}
      />
      <WelcomeOverlay
        open={fin.welcome}
        onClose={fin.handleCloseWelcome}
        onAddFirst={() => {
          fin.handleCloseWelcome();
          openQuick("expense");
        }}
      />
      <Toast msg={fin.toast} />
    </div>
  );
};

export default App;
