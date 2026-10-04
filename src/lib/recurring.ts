import { monthKey } from "./format";
import type { Recurring, Txn } from "./types";

// Strict bill matching to avoid Electricity Bill showing Internet/Water/SBI bills
export const normalizeTitle = (s: string) =>
  s.toLowerCase().trim().replaceAll(/\s+/gu, " ");

export const isBillMatch = (billTitle: string, txnNote: string): boolean => {
  const t = normalizeTitle(billTitle);
  const n = normalizeTitle(txnNote);
  if (!t || !n || t.length < 3 || n.length < 3) {
    return false;
  }
  if (t === "bill" || n === "bill") {
    return false;
  }
  if (n === t) {
    return true;
  }
  if (n.includes(t)) {
    return true;
  }
  if (t.includes(n) && n.length >= 5) {
    return true;
  }
  return false;
};

export const hasTxnThisMonth = (
  r: Recurring,
  txns: Txn[],
  today: string
): boolean => {
  const curMonth = monthKey(today);
  return txns.some((t) => {
    if (t.kind !== "expense") {
      return false;
    }
    if (!isBillMatch(r.title, t.note)) {
      return false;
    }
    return monthKey(t.date) === curMonth;
  });
};

export const hasTxnOnDate = (
  r: Recurring,
  txns: Txn[],
  date: string
): boolean =>
  txns.some((t) => {
    if (t.kind !== "expense") {
      return false;
    }
    if (!isBillMatch(r.title, t.note)) {
      return false;
    }
    return t.date === date;
  });

export const isVariableBill = (title: string): boolean => {
  const lower = title.toLowerCase();
  return (
    (lower.includes("gas") &&
      (lower.includes("cylinder") || lower.includes("lpg"))) ||
    lower.includes("gas cylinder")
  );
};

export const isPaidThisMonth = (
  r: Recurring,
  today: string,
  txns?: Txn[]
): boolean => {
  if (r.lastPaid && monthKey(r.lastPaid) === monthKey(today)) {
    return true;
  }
  if (txns && hasTxnThisMonth(r, txns, today)) {
    return true;
  }
  if (
    txns &&
    r.nextDue &&
    txns.some((t) => t.date === r.nextDue && isBillMatch(r.title, t.note))
  ) {
    return true;
  }
  return false;
};

export const isOverdue = (
  r: Recurring,
  today: string,
  txns?: Txn[]
): boolean => {
  if (!r.active) {
    return false;
  }
  // Gas cylinder refill is based on usage, not a strict monthly schedule.
  if (r.frequency === "variable") {
    return false;
  }
  if (isPaidThisMonth(r, today, txns)) {
    return false;
  }
  return r.nextDue < today;
};

export const isDueSoon = (
  r: Recurring,
  today: string,
  txns?: Txn[]
): boolean => {
  if (!r.active) {
    return false;
  }
  if (r.frequency === "variable") {
    return false;
  }
  if (isPaidThisMonth(r, today, txns)) {
    return false;
  }
  const diff = Math.round(
    (new Date(r.nextDue).getTime() - new Date(today).getTime()) / 86_400_000
  );
  return diff >= 0 && diff <= 7;
};
