#!/usr/bin/env bun
/**
 * Pebble Excel Importer - bun runtime CLI with specialized financial parsing engine
 *
 * Extracts: transaction_type, payment_method, counterparty, user_remark, expense_category
 * Strict Rule: user_remark primary for category, else counterparty
 * Handles: bills, recurring, lending, salary
 * Variable bills (electricity/water/gas): same title different amounts -> same recurring, track avg/latest
 * Health & Medical: maps "Health & Medical" and "Health & Medical (Doctor Consultation)" -> Pebble "Health"
 *
 * Usage:
 *   bun tools/import-excel.ts statement.xlsx --out import.json
 *   bun tools/import-excel.ts statement.xlsx --merge backup.json --out merged.json
 *   bun tools/import-excel.ts statement.xlsx --dry-run
 */

import { existsSync } from "node:fs";
import { readFile as readTextFile, writeFile } from "node:fs/promises";

import { readFile as readWorkbook, SSF, utils } from "xlsx";

import { parseBackup } from "../src/lib/store";
import type { BackupFile } from "../src/lib/store";
import { EXPENSE_CATS, INCOME_CATS } from "../src/lib/types";
import type {
  Kind,
  Loan,
  LoanDirection,
  Recurring,
  Txn,
} from "../src/lib/types";
import { parseTransactionText } from "./financial-parser";

const round2 = (amount: number): number =>
  Math.round((Number(amount) || 0) * 100) / 100;
const pad = (value: number): string => (value < 10 ? `0${value}` : `${value}`);
const isoDay = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addMonths = (dateString: string, months: number): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1 + months, day);
  return isoDay(date);
};

const addDays = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return isoDay(date);
};

const compareDateStrings = (first: string, second: string): number => {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
};

let fallbackUidCounter = 0;
const uid = (prefix = "t"): string => {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    fallbackUidCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${fallbackUidCounter.toString(36)}`;
  }
};

const parseAmount = (raw: ExcelCell): number => {
  const directNumber = Number(raw);
  if (raw === directNumber && Number.isFinite(directNumber)) {
    return round2(directNumber);
  }
  const cleaned = String(raw).replaceAll(/[^0-9.]/gu, "");
  if (!cleaned) {
    return 0;
  }
  const [firstPart = "", ...remainingParts] = cleaned.split(".");
  const normalized =
    remainingParts.length === 0
      ? cleaned
      : `${firstPart}.${remainingParts.join("")}`;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? round2(amount) : 0;
};

const parseExcelDate = (raw: ExcelCell): string => {
  if (!raw) {
    return isoDay(new Date());
  }
  const numericSerial = Number(raw);
  if (
    raw === numericSerial &&
    numericSerial > 30_000 &&
    numericSerial < 60_000
  ) {
    const parsedSerial = SSF.parse_date_code(numericSerial);
    if (parsedSerial) {
      return `${parsedSerial.y}-${pad(parsedSerial.m)}-${pad(parsedSerial.d)}`;
    }
  }

  const text = String(raw).trim();
  const dayFirstMatch = text.match(
    /^(?<day>\d{1,2})[/-](?<month>\d{1,2})[/-](?<year>\d{2,4})$/u
  );
  if (dayFirstMatch?.groups) {
    const {
      day: dayText,
      month: monthText,
      year: yearText,
    } = dayFirstMatch.groups;
    let year = Number(yearText);
    if (year < 100) {
      year += 2000;
    }
    const month = Number(monthText);
    const day = Number(dayText);
    if (month > 12 && day <= 12) {
      return `${year}-${pad(day)}-${pad(month)}`;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  const yearFirstMatch = text.match(
    /^(?<year>\d{4})[/-](?<month>\d{1,2})[/-](?<day>\d{1,2})/u
  );
  if (yearFirstMatch?.groups) {
    const { year, month, day } = yearFirstMatch.groups;
    return `${year}-${pad(Number(month))}-${pad(Number(day))}`;
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    return isoDay(parsedDate);
  }
  return isoDay(new Date());
};

type ExcelCell = string | number | boolean | Date | null | undefined;

interface RawRow {
  Date?: ExcelCell;
  Details?: ExcelCell;
  "Ref No/Cheque No"?: ExcelCell;
  Debit?: ExcelCell;
  Credit?: ExcelCell;
  Balance?: ExcelCell;
  [key: string]: ExcelCell;
}

const normalizeHeaders = (row: RawRow): RawRow => {
  const normalizedRow: RawRow = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = rawKey.trim().toLowerCase();
    if (key.includes("date")) {
      normalizedRow.Date = value;
    } else if (
      key.includes("detail") ||
      key.includes("narration") ||
      key.includes("particular") ||
      key.includes("description")
    ) {
      normalizedRow.Details = value;
    } else if (
      key.includes("ref") ||
      key.includes("cheque") ||
      key.includes("chq")
    ) {
      normalizedRow["Ref No/Cheque No"] = value;
    } else if (
      key === "debit" ||
      key.includes("debit") ||
      key.includes("withdrawal") ||
      key === "dr"
    ) {
      normalizedRow.Debit = value;
    } else if (
      key === "credit" ||
      key.includes("credit") ||
      key.includes("deposit") ||
      key === "cr"
    ) {
      normalizedRow.Credit = value;
    } else if (key.includes("balance")) {
      normalizedRow.Balance = value;
    } else {
      normalizedRow[rawKey] = value;
    }
  }
  return normalizedRow;
};

interface ConvertResult {
  txns: Txn[];
  loans: Loan[];
  recurrings: Recurring[];
  salaryHints: number[];
}

interface BillEntry {
  date: string;
  amount: number;
}

interface RecurringTracker {
  entries: BillEntry[];
  recurringIdx: number;
}

interface ConversionContext extends ConvertResult {
  seenRecurring: Set<string>;
  recurringTracker: Map<string, RecurringTracker>;
}

interface PreparedTransaction {
  amount: number;
  date: string;
  kind: Kind;
  note: string;
  payment: string;
  category: string;
  parsed: ReturnType<typeof parseTransactionText>;
}

const normalizeTitle = (title: string): string =>
  title.toLowerCase().replaceAll(/\s+/gu, " ").trim().slice(0, 80);

const normalizeMergeTitle = (title: string): string =>
  title.toLowerCase().replaceAll(/\s+/gu, " ").trim();

const isGasCylinder = (title: string): boolean => {
  const lowerTitle = title.toLowerCase();
  return (
    (lowerTitle.includes("gas") &&
      (lowerTitle.includes("cylinder") || lowerTitle.includes("lpg"))) ||
    lowerTitle.includes("gas cylinder")
  );
};

const mapToPebbleCategory = (rawCategory: string, kind: Kind): string => {
  const category = rawCategory.trim();
  const lowerCategory = category.toLowerCase();
  if (
    lowerCategory.startsWith("health & medical") ||
    lowerCategory === "health & medical (doctor consultation)" ||
    lowerCategory === "health"
  ) {
    return kind === "expense" ? "Health" : "Other";
  }
  if (lowerCategory.includes("health & medical")) {
    return kind === "expense" ? "Health" : "Other";
  }
  if (kind === "expense" && EXPENSE_CATS.includes(category)) {
    return category;
  }
  if (kind === "income" && INCOME_CATS.includes(category)) {
    return category;
  }
  if (category === "Salary") {
    return "Salary";
  }
  const medicalKeywords = ["medical", "doctor", "clinic", "pharma", "hospital"];
  const includesMedicalKeyword = medicalKeywords.some((keyword) =>
    lowerCategory.includes(keyword)
  );
  if (includesMedicalKeyword) {
    return kind === "expense" ? "Health" : "Other";
  }
  return "Other";
};

const getPebblePayment = (
  parsed: ReturnType<typeof parseTransactionText>
): string => {
  if (parsed.payment_method === "UPI") {
    return "UPI";
  }
  if (parsed.payment_method === "CASH") {
    return "Cash";
  }
  if (parsed.payment_method === "ATM") {
    return "Card";
  }
  const isUnspecifiedCardBill =
    parsed.payment_method === "OTHER" &&
    parsed.is_bill &&
    parsed.counterparty.includes("CARD");
  return isUnspecifiedCardBill ? "Card" : "Bank";
};

const prepareTransaction = (rawRow: RawRow): PreparedTransaction | null => {
  const row = normalizeHeaders(rawRow);
  if (!row.Date && !row.Details && !row.Debit && !row.Credit) {
    return null;
  }

  const debit = parseAmount(row.Debit ?? 0);
  const credit = parseAmount(row.Credit ?? 0);
  if (debit <= 0 && credit <= 0) {
    return null;
  }

  const isExpense = debit > 0;
  const amount = isExpense ? debit : credit;
  const date = parseExcelDate(row.Date);
  const rawDetails = String(
    row.Details || row["Ref No/Cheque No"] || "Bank transaction"
  );
  const parsed = parseTransactionText(rawDetails);
  const kind: Kind =
    parsed.transaction_type === "INFLOW" ? "income" : "expense";
  const category = mapToPebbleCategory(parsed.expense_category, kind);
  return {
    amount,
    category,
    date,
    kind,
    note: parsed.clean_note.slice(0, 200),
    parsed,
    payment: getPebblePayment(parsed),
  };
};

const createTransaction = (
  prepared: PreparedTransaction,
  overrides: {
    category?: string;
    kind?: Kind;
    loanUid?: string;
    note?: string;
  } = {}
): Txn => {
  const transaction: Txn = {
    amount: round2(prepared.amount),
    category: overrides.category ?? prepared.category,
    createdAt: new Date().toISOString(),
    date: prepared.date,
    kind: overrides.kind ?? prepared.kind,
    note: overrides.note ?? prepared.note,
    payment: prepared.payment,
    uid: uid("t"),
  };
  if (overrides.loanUid) {
    transaction.loanUid = overrides.loanUid;
  }
  return transaction;
};

const isCardBill = (
  parsed: ReturnType<typeof parseTransactionText>
): boolean => {
  const upperCounterparty = parsed.counterparty.toUpperCase();
  const isCardCompany =
    upperCounterparty.includes("SBI CARDS") ||
    upperCounterparty.includes("CRED");
  const isCardStatement =
    upperCounterparty.includes("CARD") &&
    parsed.user_remark.toLowerCase().includes("bill");
  return parsed.is_bill && (isCardCompany || isCardStatement);
};

const upsertCardBill = (
  context: ConversionContext,
  prepared: PreparedTransaction
): void => {
  const key = "card-bill";
  if (context.seenRecurring.has(key)) {
    const existing = context.recurrings.find((recurring) => recurring.card);
    if (!existing) {
      return;
    }
    const settlements = [
      ...(existing.settlements ?? []),
      { amount: round2(prepared.amount), date: prepared.date, pay: "Bank" },
    ].toSorted((first, second) => compareDateStrings(first.date, second.date));
    const latestSettlement = settlements.at(-1);
    if (!latestSettlement) {
      return;
    }
    const amounts = settlements.map((settlement) => settlement.amount);
    const average =
      amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
    existing.settlements = settlements;
    existing.lastPaid = latestSettlement.date;
    existing.nextDue = addMonths(latestSettlement.date, 1);
    existing.amount = round2(average);
    existing.averageAmount = round2(average);
    existing.latestAmount = round2(latestSettlement.amount);
    existing.occurrences = amounts.length;
    existing.amounts = [...amounts];
    return;
  }

  context.seenRecurring.add(key);
  context.recurrings.push({
    active: true,
    amount: round2(prepared.amount),
    amounts: [round2(prepared.amount)],
    averageAmount: round2(prepared.amount),
    card: true,
    category: "Other",
    createdAt: new Date().toISOString(),
    frequency: "monthly",
    lastPaid: prepared.date,
    latestAmount: round2(prepared.amount),
    nextDue: addMonths(prepared.date, 1),
    occurrences: 1,
    settlements: [
      { amount: round2(prepared.amount), date: prepared.date, pay: "Bank" },
    ],
    title: "Credit card bill",
    uid: uid("r"),
  });
};

const updateTrackedRecurring = (
  context: ConversionContext,
  prepared: PreparedTransaction,
  rawTitle: string
): void => {
  const normalizedTitle = normalizeTitle(rawTitle);
  const isVariableBill = isGasCylinder(rawTitle);
  const tracker = context.recurringTracker.get(normalizedTitle);

  if (tracker) {
    tracker.entries.push({
      amount: round2(prepared.amount),
      date: prepared.date,
    });
    const sortedEntries = [...tracker.entries].toSorted((first, second) =>
      compareDateStrings(first.date, second.date)
    );
    const amounts = sortedEntries.map((entry) => entry.amount);
    const average =
      amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
    const latestEntry = sortedEntries.at(-1);
    const recurring = context.recurrings[tracker.recurringIdx];
    if (!(latestEntry && recurring)) {
      return;
    }
    recurring.averageAmount = round2(average);
    recurring.latestAmount = round2(latestEntry.amount);
    recurring.amount = round2(average);
    recurring.lastPaid = latestEntry.date;
    recurring.occurrences = amounts.length;
    recurring.amounts = [...amounts];
    recurring.frequency =
      isVariableBill || recurring.frequency === "variable"
        ? "variable"
        : "monthly";
    recurring.nextDue =
      recurring.frequency === "variable"
        ? addDays(latestEntry.date, 50)
        : addMonths(latestEntry.date, 1);
    return;
  }

  const frequency = isVariableBill ? "variable" : "monthly";
  const recurring: Recurring = {
    active: true,
    amount: round2(prepared.amount),
    amounts: [round2(prepared.amount)],
    averageAmount: round2(prepared.amount),
    card: false,
    category: prepared.category === "Other" ? "Utilities" : prepared.category,
    createdAt: new Date().toISOString(),
    frequency,
    lastPaid: prepared.date,
    latestAmount: round2(prepared.amount),
    nextDue:
      frequency === "variable"
        ? addDays(prepared.date, 50)
        : addMonths(prepared.date, 1),
    occurrences: 1,
    settlements: [],
    title: rawTitle,
    uid: uid("r"),
  };
  context.recurrings.push(recurring);
  context.recurringTracker.set(normalizedTitle, {
    entries: [{ amount: round2(prepared.amount), date: prepared.date }],
    recurringIdx: context.recurrings.length - 1,
  });
  context.seenRecurring.add(normalizedTitle);
};

const addLendingRecords = (
  context: ConversionContext,
  prepared: PreparedTransaction
): void => {
  const person =
    prepared.parsed.counterparty
      .replaceAll(/\b(?:HDFC|KKBK|YESB|UTIB|IPOS|DEPOSIT|CASH|UPI)\b/giu, "")
      .trim()
      .slice(0, 40) || "Unknown";
  const direction: LoanDirection =
    prepared.kind === "expense" ? "lent" : "borrowed";
  const loan: Loan = {
    amount: round2(prepared.amount),
    createdAt: new Date().toISOString(),
    date: prepared.date,
    direction,
    dueDate: "",
    note: prepared.note,
    person,
    repaid: 0,
    status: "open",
    uid: uid("l"),
  };
  context.loans.push(loan);
  const note =
    direction === "lent" ? `Lent to ${person}` : `Borrowed from ${person}`;
  context.txns.push(
    createTransaction(prepared, {
      category: "Lending",
      kind: direction === "lent" ? "expense" : "income",
      loanUid: loan.uid,
      note,
    })
  );
};

const processPreparedTransaction = (
  context: ConversionContext,
  prepared: PreparedTransaction
): void => {
  if (prepared.parsed.is_salary) {
    prepared.category = "Salary";
    context.salaryHints.push(prepared.amount);
  }
  if (prepared.parsed.is_lending) {
    addLendingRecords(context, prepared);
    return;
  }
  if (isCardBill(prepared.parsed)) {
    upsertCardBill(context, prepared);
    return;
  }
  if (prepared.parsed.is_bill && prepared.parsed.is_recurring_candidate) {
    const rawTitle = prepared.parsed.counterparty.slice(0, 60);
    if (rawTitle !== "Unknown" && prepared.amount > 0) {
      updateTrackedRecurring(context, prepared, rawTitle);
    }
  }
  context.txns.push(createTransaction(prepared));
};

const createConversionContext = (): ConversionContext => ({
  loans: [],
  recurringTracker: new Map<string, RecurringTracker>(),
  recurrings: [],
  salaryHints: [],
  seenRecurring: new Set<string>(),
  txns: [],
});

const convertRows = (rows: RawRow[]): ConvertResult => {
  const context = createConversionContext();
  for (const row of rows) {
    const prepared = prepareTransaction(row);
    if (prepared) {
      processPreparedTransaction(context, prepared);
    }
  }
  return {
    loans: context.loans,
    recurrings: context.recurrings,
    salaryHints: context.salaryHints,
    txns: context.txns,
  };
};

const printHelp = (): void => {
  console.log(`
Pebble Excel Importer - with Financial Parsing Engine

Usage:
  bun tools/import-excel.ts <excel-file> [options]

Options:
  --out <file>        Output JSON (default: pebble-import-<date>.json)
  --merge <backup>    Merge into existing Pebble backup
  --dry-run           Preview parsed JSON, don't write
  --help              Help

Excel columns: Date, Details/Narration, Ref No/Cheque No, Debit, Credit, Balance

Parsing Engine extracts:
  transaction_type: INFLOW/OUTFLOW
  payment_method: UPI/NEFT/IMPS/ATM/CASH/OTHER
  counterparty, user_remark, expense_category (remark primary)

Differentiates:
  - Bills (Airtel, SBI Cards, CRED, AMC, Bill Payment) -> recurring
  - Variable bills (electricity, water, gas same title different amounts) -> same recurring with avg/latest
  - Lending (person names like RISHI) -> loans
  - Salary (KRISCENT TECHNO) -> Salary
  - Health & Medical: DR prefix, body parts (Diabetes, Dental, Eye), Swasth/Seva, Medi/@/dr suffix -> Health
  - Card bills -> settlements, not double-counted

Output is Pebble BackupFile ready for Care > Restore.
`);
};

const average = (values: number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;

const makeInitialBackup = (result: ConvertResult): BackupFile => ({
  app: "pebble",
  deviceId: "local",
  exportedAt: new Date().toISOString(),
  loans: result.loans,
  promises: [],
  recurrings: result.recurrings,
  settings: {
    budgets: {},
    currency: "₹",
    expectedSalary: round2(average(result.salaryHints)),
    incomeAcks: {},
    lastBackupAt: "",
    name: "Friend",
    payday: 1,
  },
  transactions: result.txns,
  version: 2,
});

const printConversionSummary = (result: ConvertResult): void => {
  const expenseCount = result.txns.filter(
    (transaction) => transaction.kind === "expense"
  ).length;
  const incomeCount = result.txns.filter(
    (transaction) => transaction.kind === "income"
  ).length;
  console.log("\n💰 Parsed:");
  console.log(`   - ${result.txns.length} transactions`);
  console.log(`     expense: ${expenseCount}, income: ${incomeCount}`);
  console.log(`   - ${result.loans.length} lending/borrow`);
  console.log(`   - ${result.recurrings.length} bills/recurring`);
  if (result.salaryHints.length > 0) {
    console.log(
      `   - salary hints: ${result.salaryHints.length}, avg ${round2(average(result.salaryHints))}`
    );
  }

  const byCategory = new Map<string, number>();
  for (const transaction of result.txns) {
    if (transaction.kind === "expense") {
      const current = byCategory.get(transaction.category) ?? 0;
      byCategory.set(transaction.category, current + transaction.amount);
    }
  }
  console.log("\n📊 Where it went (expense by category):");
  const categoriesBySpend = [...byCategory.entries()].toSorted(
    ([, firstAmount], [, secondAmount]) => secondAmount - firstAmount
  );
  for (const [category, amount] of categoriesBySpend) {
    console.log(`   - ${category}: ${amount}`);
  }

  const variableBills = result.recurrings.filter(
    (recurring) =>
      (recurring.occurrences ?? 0) > 1 || (recurring.amounts?.length ?? 0) > 1
  );
  if (variableBills.length > 0) {
    console.log("\n⚡ Variable bills (same title, different amounts):");
    for (const recurring of variableBills) {
      console.log(
        `   - ${recurring.title}: amounts=${JSON.stringify(recurring.amounts)} avg=${recurring.averageAmount} latest=${recurring.latestAmount} lastPaid=${recurring.lastPaid} nextDue=${recurring.nextDue}`
      );
    }
  }
};

const printDryRun = (result: ConvertResult): void => {
  console.log("\n--- Dry run preview ---");
  console.log(
    JSON.stringify(
      {
        loans: result.loans.slice(0, 3),
        recurrings: result.recurrings.slice(0, 5),
        txns: result.txns.slice(0, 5),
      },
      null,
      2
    )
  );
};

const transactionDedupeKey = (transaction: Txn): string =>
  `${transaction.date}|${transaction.amount}|${transaction.note.slice(0, 50)}`;

const loanDedupeKey = (loan: Loan): string =>
  `${loan.date}|${loan.amount}|${loan.person}`;

const mergeCardSettlements = (
  existing: Recurring,
  incoming: Recurring
): void => {
  const settlements = [
    ...(existing.settlements ?? []),
    ...(incoming.settlements ?? []),
  ].toSorted((first, second) => compareDateStrings(first.date, second.date));
  const latestSettlement = settlements.at(-1);
  if (!latestSettlement) {
    return;
  }
  const amounts = settlements.map((settlement) => settlement.amount);
  const mean = round2(average(amounts));
  existing.settlements = settlements;
  existing.amount = mean;
  existing.averageAmount = mean;
  existing.latestAmount = round2(latestSettlement.amount);
  existing.lastPaid = latestSettlement.date;
  existing.nextDue = addMonths(latestSettlement.date, 1);
  existing.occurrences = amounts.length;
  existing.amounts = [...amounts];
};

const mergeRecurringHistory = (
  existing: Recurring,
  incoming: Recurring
): void => {
  const allAmounts = [
    ...(existing.amounts ?? [existing.amount]),
    ...(incoming.amounts ?? [incoming.amount]),
  ];
  const { lastPaid: existingLastPaid, latestAmount: existingLatestAmount } =
    existing;
  const { lastPaid: incomingLastPaid, latestAmount: incomingLatestAmount } =
    incoming;
  const allDates = [existingLastPaid, incomingLastPaid]
    .filter((date) => date.length > 0)
    .toSorted(compareDateStrings);
  const latestDate = allDates.at(-1) ?? existingLastPaid ?? incomingLastPaid;
  const mean = round2(average(allAmounts));
  let latestAmount = incomingLatestAmount;
  if (latestDate !== incomingLastPaid && latestDate === existingLastPaid) {
    latestAmount = existingLatestAmount;
  }

  existing.amounts = allAmounts;
  existing.averageAmount = mean;
  existing.amount = mean;
  existing.latestAmount = round2(
    latestAmount ?? incomingLatestAmount ?? incoming.amount
  );
  existing.lastPaid = latestDate;
  existing.occurrences = allAmounts.length;

  const isVariable =
    isGasCylinder(existing.title) ||
    isGasCylinder(incoming.title) ||
    existing.frequency === "variable" ||
    incoming.frequency === "variable";
  if (isVariable) {
    existing.frequency = "variable";
    existing.nextDue = addDays(latestDate, 50);
  } else {
    existing.nextDue = addMonths(latestDate, 1);
  }
};

const mergeTransactions = (existing: Txn[], incoming: Txn[]): number => {
  const seen = new Set(existing.map(transactionDedupeKey));
  let added = 0;
  for (const transaction of incoming) {
    const key = transactionDedupeKey(transaction);
    if (!seen.has(key)) {
      existing.push(transaction);
      seen.add(key);
      added += 1;
    }
  }
  return added;
};

const mergeLoans = (existing: Loan[], incoming: Loan[]): number => {
  const seen = new Set(existing.map(loanDedupeKey));
  let added = 0;
  for (const loan of incoming) {
    const key = loanDedupeKey(loan);
    if (!seen.has(key)) {
      existing.push(loan);
      seen.add(key);
      added += 1;
    }
  }
  return added;
};

const mergeRecurringRecords = (
  existing: Recurring[],
  incoming: Recurring[]
): number => {
  const indexes = new Map<string, number>();
  for (const [index, recurring] of existing.entries()) {
    indexes.set(normalizeMergeTitle(recurring.title), index);
  }

  let added = 0;
  for (const recurring of incoming) {
    const key = normalizeMergeTitle(recurring.title);
    if (key === "credit card bill") {
      const cardBill = existing.find((entry) => entry.card);
      if (cardBill) {
        mergeCardSettlements(cardBill, recurring);
      } else {
        existing.push(recurring);
        added += 1;
      }
    } else {
      const index = indexes.get(key);
      const match = index === undefined ? undefined : existing[index];
      if (match) {
        mergeRecurringHistory(match, recurring);
      } else {
        existing.push(recurring);
        indexes.set(key, existing.length - 1);
        added += 1;
      }
    }
  }
  return added;
};

const mergeBackups = async (
  result: ConvertResult,
  mergePath: string
): Promise<BackupFile> => {
  if (!existsSync(mergePath)) {
    throw new Error(`Merge file not found: ${mergePath}`);
  }
  console.log(`\n🔗 Merging with ${mergePath}...`);
  const existingRaw = await readTextFile(mergePath, "utf-8");
  const existing = parseBackup(existingRaw);
  const addedTransactions = mergeTransactions(
    existing.transactions,
    result.txns
  );
  const addedLoans = mergeLoans(existing.loans, result.loans);
  const addedRecurrings = mergeRecurringRecords(
    existing.recurrings,
    result.recurrings
  );

  console.log(
    `✅ Added ${addedTransactions} txns, ${addedLoans} loans, ${addedRecurrings} recurrings (variable bills merged by title)`
  );
  return {
    ...existing,
    app: "pebble",
    exportedAt: new Date().toISOString(),
    loans: existing.loans,
    recurrings: existing.recurrings,
    transactions: existing.transactions,
    version: 2,
  };
};

interface CliOptions {
  excelPath: string;
  outPath: string;
  mergePath: string | null;
  dryRun: boolean;
  showHelp: boolean;
}

const parseCliOptions = (args: string[]): CliOptions => {
  const [excelPath = ""] = args;
  const outIndex = args.indexOf("--out");
  const mergeIndex = args.indexOf("--merge");
  const outArgument = outIndex === -1 ? undefined : args[outIndex + 1];
  const mergeArgument = mergeIndex === -1 ? undefined : args[mergeIndex + 1];
  const outPath =
    outArgument && !outArgument.startsWith("--")
      ? outArgument
      : `pebble-import-${isoDay(new Date())}.json`;
  const mergePath =
    mergeArgument && !mergeArgument.startsWith("--") ? mergeArgument : null;
  return {
    dryRun: args.includes("--dry-run"),
    excelPath,
    mergePath,
    outPath,
    showHelp:
      args.length === 0 || args.includes("--help") || args.includes("-h"),
  };
};

interface ExcelWorkbookRows {
  rows: RawRow[];
  sheetName: string;
}

const readExcelRows = (excelPath: string): ExcelWorkbookRows => {
  const workbook = readWorkbook(excelPath);
  const [sheetName] = workbook.SheetNames;
  if (!sheetName) {
    throw new Error("No sheets");
  }
  const sheet = workbook.Sheets[sheetName];
  return {
    rows: utils.sheet_to_json<RawRow>(sheet, { defval: "" }),
    sheetName,
  };
};

const main = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.showHelp) {
    printHelp();
    return;
  }
  if (!existsSync(options.excelPath)) {
    throw new Error(`File not found: ${options.excelPath}`);
  }

  console.log(`📖 Reading ${options.excelPath}...`);
  const { rows, sheetName } = readExcelRows(options.excelPath);
  console.log(`📄 ${rows.length} rows in "${sheetName}"`);
  const result = convertRows(rows);
  printConversionSummary(result);

  if (options.dryRun) {
    printDryRun(result);
    return;
  }

  let finalBackup = makeInitialBackup(result);
  if (options.mergePath) {
    finalBackup = await mergeBackups(result, options.mergePath);
  }
  await writeFile(
    options.outPath,
    JSON.stringify(finalBackup, null, 2),
    "utf-8"
  );
  console.log(`\n✅ Wrote to ${options.outPath}`);
  console.log(
    `   - ${finalBackup.transactions.length} txns, ${finalBackup.loans.length} loans, ${finalBackup.recurrings.length} bills`
  );
  console.log("   Import via Pebble > Care > Data > Restore from file");
  console.log(
    "\nponytail: variable bills dedup by title, avg/latest tracking, Health mapping, reuse parser"
  );
};

try {
  await main();
} catch (error) {
  console.error("❌", error);
  process.exitCode = 1;
}
