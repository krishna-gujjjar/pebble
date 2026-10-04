import { AnimatePresence } from "motion/react";

import type { Kind, Txn } from "../lib/types";
import QuickSheet from "./quick-sheet";
import type { QuickSave } from "./quick-sheet";

const QuickAdd = ({
  open,
  initialKind,
  txns,
  persons,
  currency,
  onClose,
  onSave,
}: {
  open: boolean;
  initialKind: Kind | "lend";
  txns: Txn[];
  persons: string[];
  currency: string;
  onClose: () => void;
  onSave: (s: QuickSave) => void;
}) => (
  <AnimatePresence>
    {open ? (
      <QuickSheet
        initialKind={initialKind}
        txns={txns}
        persons={persons}
        currency={currency}
        onClose={onClose}
        onSave={onSave}
      />
    ) : null}
  </AnimatePresence>
);

export default QuickAdd;
