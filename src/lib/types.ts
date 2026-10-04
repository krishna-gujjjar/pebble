export type Kind = "expense" | "income";
export type LoanDirection = "lent" | "borrowed";
export type Frequency = "monthly" | "weekly" | "yearly" | "variable";

export interface Txn {
  uid: string;
  kind: Kind;
  amount: number;
  category: string;
  note: string;
  date: string;
  payment: string;
  createdAt: string;
  /** set when this entry mirrors a loan cash-flow (lend/borrow/repay/settle) */
  loanUid?: string;
}

export interface Loan {
  uid: string;
  direction: LoanDirection;
  person: string;
  amount: number;
  repaid: number;
  note: string;
  date: string;
  dueDate: string;
  status: "open" | "settled";
  createdAt: string;
}

/** one payment made towards a credit-card bill (money moved, not spending) */
export interface CardSettlement {
  amount: number;
  date: string;
  pay: string;
}

export interface Recurring {
  uid: string;
  title: string;
  amount: number;
  category: string;
  frequency: Frequency;
  nextDue: string;
  active: boolean;
  lastPaid: string;
  createdAt: string;
  /**
   * true for a credit-card bill: paying it moves no new money (the purchases
   * were already logged), so it never writes a spending entry.
   */
  card?: boolean;
  /** history of bill payments, so the maths stays checkable */
  settlements?: CardSettlement[];
  /** variable bill tracking (electricity, water, gas) - same title different amounts */
  averageAmount?: number;
  latestAmount?: number;
  amounts?: number[];
  occurrences?: number;
}

export interface IncomePromise {
  uid: string;
  category: string;
  note: string;
  expected: number;
  month: string;
  due: string;
  createdAt: string;
}

export interface Settings {
  name: string;
  currency: string;
  payday: number;
  expectedSalary: number;
  budgets: Record<string, number>;
  lastBackupAt: string;
  /** "YYYY-MM|Category" -> "1" once the shortfall question was answered */
  incomeAcks: Record<string, string>;
}

export type Tone = "celebrate" | "calm" | "nudge" | "watch";

export interface Insight {
  id: string;
  tone: Tone;
  title: string;
  body: string;
  cta?: string;
  go?: string;
  priority: number;
  /** the one-line "why this matters" an assistant would add */
  why?: string;
  /** a short number chip, e.g. "₹4,200 · due Fri 5 Sep" */
  metric?: string;
}

export interface Milestone {
  id: string;
  title: string;
  body: string;
  unlocked: boolean;
  progress: number;
}

export interface InsightCtx {
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  promises: IncomePromise[];
  settings: Settings;
  now: Date;
}

export const EXPENSE_CATS = [
  "Groceries",
  "Dining",
  "Transport",
  "Rent",
  "Utilities",
  "Subscriptions",
  "Shopping",
  "Health",
  "Fun",
  "Travel",
  "Education",
  "Other",
];

export const INCOME_CATS = [
  "Salary",
  "Freelance",
  "Business",
  "Interest",
  "Gift",
  "Refund",
  "Other",
];

export const CURRENCIES = [
  { code: "$", label: "Dollar ($)" },
  { code: "€", label: "Euro (€)" },
  { code: "£", label: "Pound (£)" },
  { code: "₹", label: "Rupee (₹)" },
  { code: "¥", label: "Yen/Yuan (¥)" },
  { code: "₦", label: "Naira (₦)" },
  { code: "R", label: "Rand (R)" },
];
