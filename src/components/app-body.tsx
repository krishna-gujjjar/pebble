import type { RecurringCandidate } from "../lib/analytics";
import type { Briefing } from "../lib/insights-briefing";
import type { BackupFile } from "../lib/store";
import type { Tab } from "../lib/tabs";
import type {
  IncomePromise,
  Insight,
  Loan,
  Recurring,
  Settings,
  Txn,
} from "../lib/types";
import type { RecForm } from "./bills";
import Bills from "./bills";
import Care from "./care";
import Dashboard from "./dashboard";
import InsightsView from "./insights-view";
import Lending from "./lending";
import Reports from "./reports";
import Transactions from "./transactions";

export interface AppBodyProps {
  tab: Tab;
  visible: Insight[];
  briefing: Briefing;
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
  settings: Settings;
  dismissed: string[];
  candidates: RecurringCandidate[];
  onGo: (dest: string) => void;
  onOpenQuick: (k: "expense" | "income" | "lend") => void;
  onSnooze: () => void;
  onEdit: (t: Txn) => void;
  onDismiss: (id: string) => void;
  onDismissAll: (ids: string[]) => void;
  onSettlePromise: (uid: string) => void;
  onDeleteTxn: (uid: string) => void;
  onRepayLoan: (uid: string, amt: number) => void;
  onSettleLoan: (uid: string) => void;
  onDeleteLoan: (uid: string) => void;
  onPaidRecurring: (uid: string) => void;
  onToggleRecurring: (uid: string) => void;
  onDeleteRecurring: (uid: string) => void;
  onAddRecurring: (f: RecForm) => void;
  onUpdateRecurring: (uid: string, f: Partial<RecForm>) => void;
  onTrackCandidate: (c: {
    amount: number;
    category: string;
    title: string;
  }) => void;
  onSettings: (s: Settings) => void;
  onRestore: (b: BackupFile) => void;
  onWipe: () => void;
}

const AppBody = ({
  tab,
  visible,
  briefing,
  txns,
  loans,
  recurrings,
  promises,
  settings,
  dismissed,
  candidates,
  onGo,
  onOpenQuick,
  onSnooze,
  onEdit,
  onDismiss,
  onDismissAll,
  onSettlePromise,
  onDeleteTxn,
  onRepayLoan,
  onSettleLoan,
  onDeleteLoan,
  onPaidRecurring,
  onToggleRecurring,
  onDeleteRecurring,
  onAddRecurring,
  onUpdateRecurring,
  onTrackCandidate,
  onSettings,
  onRestore,
  onWipe,
}: AppBodyProps) => {
  const { currency } = settings;
  switch (tab) {
    case "home": {
      return (
        <Dashboard
          txns={txns}
          loans={loans}
          recurrings={recurrings}
          promises={promises}
          settings={settings}
          insights={visible}
          dismissed={dismissed}
          onOpenQuick={onOpenQuick}
          onGo={onGo}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
          onPromiseSettled={onSettlePromise}
        />
      );
    }
    case "transactions": {
      return (
        <Transactions
          txns={txns}
          currency={currency}
          onDelete={onDeleteTxn}
          onEdit={onEdit}
          onNew={() => onOpenQuick("expense")}
        />
      );
    }
    case "lending": {
      return (
        <Lending
          loans={loans}
          currency={currency}
          onRepay={onRepayLoan}
          onSettle={onSettleLoan}
          onDelete={onDeleteLoan}
          onNew={() => onOpenQuick("lend")}
        />
      );
    }
    case "recurring": {
      return (
        <Bills
          recurrings={recurrings}
          currency={currency}
          txns={txns}
          candidates={candidates}
          onPaid={onPaidRecurring}
          onToggle={onToggleRecurring}
          onDelete={onDeleteRecurring}
          onAdd={onAddRecurring}
          onUpdate={onUpdateRecurring}
          onTrack={onTrackCandidate}
          onSeeMaths={() => onGo("reports")}
        />
      );
    }
    case "reports": {
      return (
        <Reports txns={txns} recurrings={recurrings} currency={currency} />
      );
    }
    case "insights": {
      return (
        <InsightsView
          insights={visible}
          dismissed={dismissed}
          briefing={briefing}
          txns={txns}
          loans={loans}
          recurrings={recurrings}
          settings={settings}
          onGo={onGo}
          onDismiss={onDismiss}
          onClearAll={onDismissAll}
        />
      );
    }
    case "care": {
      return (
        <Care
          settings={settings}
          txns={txns}
          loans={loans}
          recurrings={recurrings}
          promises={promises}
          onSettings={onSettings}
          onRestore={onRestore}
          onWipe={onWipe}
        />
      );
    }
    default: {
      return null;
    }
  }
};

export default AppBody;
