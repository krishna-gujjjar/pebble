import { useEffect, useReducer, useState } from "react";
import type { Dispatch } from "react";

import { financeReducer } from "../lib/finance-reducer";
import type { FinAction, FinState } from "../lib/finance-reducer";
import { buildStarterData } from "../lib/seed";
import { LS, defaultSettings, loadJSON } from "../lib/store";
import type {
  IncomePromise,
  Loan,
  Recurring,
  Settings,
  Txn,
} from "../lib/types";

export interface FinanceStore {
  state: FinState;
  dispatch: Dispatch<FinAction>;
  booted: boolean;
  welcome: boolean;
  setWelcome: (v: boolean) => void;
}

const persist = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full - app still works in memory */
  }
};

export const initFinanceState = (): FinState => ({
  dismissed: loadJSON<string[]>(LS.dismissed, []),
  loans: loadJSON<Loan[]>(LS.loans, []),
  promises: loadJSON<IncomePromise[]>(LS.promises, []),
  recurrings: loadJSON<Recurring[]>(LS.recurrings, []),
  settings: {
    ...defaultSettings(),
    ...loadJSON<Partial<Settings>>(LS.settings, {}),
  },
  txns: loadJSON<Txn[]>(LS.txns, []),
});

const needsStarterData = (base: FinState): boolean => {
  const seeded = loadJSON<string>(LS.seeded, "");
  const empty =
    base.txns.length === 0 &&
    base.loans.length === 0 &&
    base.recurrings.length === 0;
  return !seeded && empty;
};

export const useFinanceState = (): FinanceStore => {
  const [state, dispatch] = useReducer(financeReducer, null, () => {
    const base = initFinanceState();
    if (!needsStarterData(base)) {
      return base;
    }
    const s = buildStarterData(new Date());
    return { ...base, loans: s.loans, recurrings: s.recurrings, txns: s.txns };
  });
  const [welcome, setWelcome] = useState(() =>
    needsStarterData(initFinanceState())
  );

  useEffect(() => persist(LS.txns, state.txns), [state.txns]);
  useEffect(() => persist(LS.loans, state.loans), [state.loans]);
  useEffect(() => persist(LS.recurrings, state.recurrings), [state.recurrings]);
  useEffect(() => persist(LS.promises, state.promises), [state.promises]);
  useEffect(() => persist(LS.settings, state.settings), [state.settings]);
  useEffect(() => persist(LS.dismissed, state.dismissed), [state.dismissed]);
  useEffect(() => persist(LS.seeded, "1"), []);

  return {
    booted: true,
    dispatch,
    setWelcome,
    state,
    welcome,
  };
};
