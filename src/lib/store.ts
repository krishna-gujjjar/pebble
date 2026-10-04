import type { IncomePromise, Loan, Recurring, Settings, Txn } from "./types";

export const LS = {
  device: "pebble.device.v1",
  dismissed: "pebble.dismissed.v1",
  loans: "pebble.loans.v1",
  promises: "pebble.promises.v1",
  recurrings: "pebble.recurrings.v1",
  seeded: "pebble.seeded.v1",
  settings: "pebble.settings.v1",
  txns: "pebble.txns.v1",
};

export const uid = (prefix = "id"): string => {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    /* old or non-secure context: fall through */
  }
  try {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}-${hex}`;
  } catch {
    /* no Web Crypto at all: timestamp keeps ids unique enough for one tab */
    return `${prefix}-${Date.now().toString(36)}`;
  }
};

export const loadJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    // SAFETY: callers choose the domain type T and fall back when parse fails.
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const saveJSON = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full - app still works in memory */
  }
};

export const defaultSettings = (): Settings => ({
  budgets: { Dining: 220, Fun: 120, Groceries: 380, Shopping: 260 },
  currency: "$",
  expectedSalary: 3450,
  incomeAcks: {},
  lastBackupAt: "",
  name: "Friend",
  payday: 1,
});

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  deviceId: string;
  settings: Settings;
  transactions: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
}

export const buildBackup = (
  settings: Settings,
  txns: Txn[],
  loans: Loan[],
  recurrings: Recurring[],
  promises: IncomePromise[]
): BackupFile => ({
  app: "pebble",
  deviceId: "local",
  exportedAt: new Date().toISOString(),
  loans,
  promises,
  recurrings,
  settings,
  transactions: txns,
  version: 2,
});

export const parseBackup = (json: string): BackupFile => {
  // SAFETY: shape validated by the throws/fallback logic below.
  const b = JSON.parse(json) as BackupFile;
  if (!b || b.app !== "pebble" || !Array.isArray(b.transactions)) {
    throw new Error("That file is not a Pebble backup.");
  }
  return {
    ...b,
    loans: Array.isArray(b.loans) ? b.loans : [],
    promises: Array.isArray(b.promises) ? b.promises : [],
    recurrings: Array.isArray(b.recurrings) ? b.recurrings : [],
    settings: { ...defaultSettings(), ...b.settings },
  };
};
