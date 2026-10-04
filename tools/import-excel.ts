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
import { readFile, writeFile } from "node:fs/promises";

import * as XLSX from "xlsx";

import { parseTransactionText } from "./financial-parser";

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const parseAmount = (raw: any): number => {
  if (typeof raw === "number") {
    return round2(raw);
  }
  const cleaned = String(raw).replaceAll(/[^0-9.]/gu, "");
  if (!cleaned) {
    return 0;
  }
  const parts = cleaned.split(".");
  const normalized =
    parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
  const v = Number(normalized);
  return Number.isFinite(v) ? round2(v) : 0;
};
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addMonths = (dateStr: string, months: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return isoDay(dt);
};
const uid = (prefix = "t"): string => {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
};

const parseExcelDate = (raw: any): string => {
  if (!raw) {
    return isoDay(new Date());
  }
  if (typeof raw === "number" && raw > 30_000 && raw < 60_000) {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) {
      return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    }
  }
  const str = String(raw).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    let y = Number(yyyy);
    if (y < 100) {
      y += 2000;
    }
    const m = Number(mm);
    const d = Number(dd);
    if (m > 12 && d <= 12) {
      return `${y}-${pad(d)}-${pad(m)}`;
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }
  const iso = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${pad(Number(m))}-${pad(Number(d))}`;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return isoDay(parsed);
  }
  return isoDay(new Date());
};

interface RawRow {
  Date?: any;
  Details?: any;
  "Ref No/Cheque No"?: any;
  Debit?: any;
  Credit?: any;
  Balance?: any;
  [key: string]: any;
}

const normalizeHeaders = (row: any): RawRow => {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim().toLowerCase();
    if (key.includes("date")) {
      out.Date = v;
    } else if (
      key.includes("detail") ||
      key.includes("narration") ||
      key.includes("particular") ||
      key.includes("description")
    ) {
      out.Details = v;
    } else if (
      key.includes("ref") ||
      key.includes("cheque") ||
      key.includes("chq")
    ) {
      out["Ref No/Cheque No"] = v;
    } else if (
      key === "debit" ||
      key.includes("debit") ||
      key.includes("withdrawal") ||
      key === "dr"
    ) {
      out.Debit = v;
    } else if (
      key === "credit" ||
      key.includes("credit") ||
      key.includes("deposit") ||
      key === "cr"
    ) {
      out.Credit = v;
    } else if (key.includes("balance")) {
      out.Balance = v;
    } else {
      out[k] = v;
    }
  }
  return out as RawRow;
};

interface ConvertResult {
  txns: any[];
  loans: any[];
  recurrings: any[];
  salaryHints: number[];
}

const mapToPebbleCategory = (rawCat: string, kind: string): string => {
  const validExpense = [
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
  const validIncome = [
    "Salary",
    "Freelance",
    "Business",
    "Interest",
    "Gift",
    "Refund",
    "Other",
  ];
  const cat = rawCat.trim();
  const lower = cat.toLowerCase();
  // Health & Medical mapping per spec - ponytail: reuse existing health detection, map to Pebble Health
  if (
    lower.startsWith("health & medical") ||
    lower === "health & medical (doctor consultation)" ||
    lower === "health"
  ) {
    return kind === "expense" ? "Health" : "Other";
  }
  if (lower.includes("health & medical")) {
    return kind === "expense" ? "Health" : "Other";
  }
  if (kind === "expense" && validExpense.includes(cat)) {
    return cat;
  }
  if (kind === "income" && validIncome.includes(cat)) {
    return cat;
  }
  if (cat === "Salary") {
    return "Salary";
  }
  // Additional medical keywords fallback
  if (
    lower.includes("medical") ||
    lower.includes("doctor") ||
    lower.includes("clinic") ||
    lower.includes("pharma") ||
    lower.includes("hospital")
  ) {
    return kind === "expense" ? "Health" : "Other";
  }
  return "Other";
};

const convertRows = (rows: RawRow[]): ConvertResult => {
  const txns: any[] = [];
  const loans: any[] = [];
  const recurrings: any[] = [];
  const salaryHints: number[] = [];
  const seenRecurring = new Set<string>();
  // Variable bill tracker: key = normalized title, value = { entries: {date, amount}[], recurringIdx }
  const recurringTracker = new Map<
    string,
    { entries: { date: string; amount: number }[]; recurringIdx: number }
  >();

  const normalizeTitle = (t: string) =>
    t.toLowerCase().replaceAll(/\s+/g, " ").trim().slice(0, 80);
  const isGasCylinder = (title: string) => {
    const lower = title.toLowerCase();
    return (
      (lower.includes("gas") &&
        (lower.includes("cylinder") || lower.includes("lpg"))) ||
      lower.includes("gas cylinder")
    );
  };
  const addDays = (dateStr: string, days: number) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    return isoDay(dt);
  };

  for (const raw of rows) {
    const r = normalizeHeaders(raw);
    if (!r.Date && !r.Details && !r.Debit && !r.Credit) {
      continue;
    }

    const debit = parseAmount(r.Debit ?? 0);
    const credit = parseAmount(r.Credit ?? 0);
    if (debit <= 0 && credit <= 0) {
      continue;
    }

    const isExpense = debit > 0;
    const amount = isExpense ? debit : credit;
    const date = parseExcelDate(r.Date);
    const rawDetails = String(
      r.Details || r["Ref No/Cheque No"] || "Bank transaction"
    );

    const parsed = parseTransactionText(rawDetails);
    const kind = parsed.transaction_type === "INFLOW" ? "income" : "expense";

    let pebblePayment = "Bank";
    if (parsed.payment_method === "UPI") {
      pebblePayment = "UPI";
    } else if (parsed.payment_method === "CASH") {
      pebblePayment = "Cash";
    } else if (parsed.payment_method === "ATM") {
      pebblePayment = "Card";
    } else if (
      parsed.payment_method === "OTHER" &&
      parsed.is_bill &&
      parsed.counterparty.includes("CARD")
    ) {
      pebblePayment = "Card";
    } else {
      pebblePayment = "Bank";
    }

    const note = parsed.clean_note.slice(0, 200);
    let category = mapToPebbleCategory(parsed.expense_category, kind);

    if (parsed.is_salary) {
      category = "Salary";
      salaryHints.push(amount);
    }

    if (parsed.is_lending) {
      const person =
        parsed.counterparty
          .replaceAll(/\b(HDFC|KKBK|YESB|UTIB|IPOS|DEPOSIT|CASH|UPI)\b/gi, "")
          .trim()
          .slice(0, 40) || "Unknown";
      const direction = kind === "expense" ? "lent" : "borrowed";
      const loan = {
        amount: round2(amount),
        createdAt: new Date().toISOString(),
        date,
        direction,
        dueDate: "",
        note,
        person,
        repaid: 0,
        status: "open",
        uid: uid("l"),
      };
      loans.push(loan);
      txns.push({
        amount: round2(amount),
        category: "Lending",
        createdAt: new Date().toISOString(),
        date,
        kind: direction === "lent" ? "expense" : "income",
        loanUid: loan.uid,
        note:
          direction === "lent"
            ? `Lent to ${person}`
            : `Borrowed from ${person}`,
        payment: pebblePayment,
        uid: uid("t"),
      });
      continue;
    }

    if (
      parsed.is_bill &&
      (parsed.counterparty.toUpperCase().includes("SBI CARDS") ||
        parsed.counterparty.toUpperCase().includes("CRED") ||
        (parsed.counterparty.toUpperCase().includes("CARD") &&
          parsed.user_remark.toLowerCase().includes("bill")))
    ) {
      const key = "card-bill";
      if (seenRecurring.has(key)) {
        const existing = recurrings.find((r) => r.card);
        if (existing) {
          existing.settlements = [
            ...(existing.settlements || []),
            { amount: round2(amount), date, pay: "Bank" },
          ].toSorted((a: any, b: any) =>
            a.date < b.date ? -1 : a.date > b.date ? 1 : 0
          );
          // pick latest by max date
          const latestSettle = existing.settlements.at(-1);
          existing.lastPaid = latestSettle.date;
          existing.nextDue = addMonths(latestSettle.date, 1);
          const allAmounts = existing.settlements.map((s: any) => s.amount);
          const avg =
            allAmounts.reduce((a: number, b: number) => a + b, 0) /
            allAmounts.length;
          existing.amount = round2(avg);
          existing.averageAmount = round2(avg);
          existing.latestAmount = round2(latestSettle.amount);
          existing.occurrences = allAmounts.length;
          existing.amounts = [...allAmounts];
        }
      } else {
        seenRecurring.add(key);
        recurrings.push({
          active: true,
          amount: round2(amount),
          amounts: [round2(amount)],
          averageAmount: round2(amount),
          card: true,
          category: "Other",
          createdAt: new Date().toISOString(),
          frequency: "monthly",
          lastPaid: date,
          latestAmount: round2(amount),
          nextDue: addMonths(date, 1),
          occurrences: 1,
          settlements: [{ amount: round2(amount), date, pay: "Bank" }],
          title: "Credit card bill",
          uid: uid("r"),
        });
      }
      continue;
    }

    // Regular bill: variable amount handling - dedup by title only, not amount
    // Ponytail ladder: 1) YAGNI - need variable bills, 2) reuse existing parser, 3) stdlib Date, 4) minimal code
    if (parsed.is_bill && parsed.is_recurring_candidate) {
      const rawTitle = parsed.counterparty.slice(0, 60);
      const normKey = normalizeTitle(rawTitle);
      if (parsed.counterparty !== "Unknown" && amount > 0) {
        const isGas = isGasCylinder(rawTitle);
        const freq = isGas ? "variable" : "monthly";
        if (recurringTracker.has(normKey)) {
          const tracker = recurringTracker.get(normKey)!;
          tracker.entries.push({ amount: round2(amount), date });
          // Recompute from all entries sorted by date to get correct latest
          const sorted = [...tracker.entries].toSorted((a, b) =>
            a.date < b.date ? -1 : a.date > b.date ? 1 : 0
          );
          const amounts = sorted.map((e) => e.amount);
          const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
          const latestEntry = sorted.at(-1);
          const rec = recurrings[tracker.recurringIdx];
          rec.averageAmount = round2(avg);
          rec.latestAmount = round2(latestEntry.amount);
          rec.amount = round2(avg);
          rec.lastPaid = latestEntry.date;
          rec.occurrences = amounts.length;
          rec.amounts = [...amounts];
          rec.frequency =
            isGas || rec.frequency === "variable" ? "variable" : "monthly";
          rec.nextDue =
            rec.frequency === "variable"
              ? addDays(latestEntry.date, 50)
              : addMonths(latestEntry.date, 1);
        } else {
          const rec = {
            active: true,
            amount: round2(amount),
            amounts: [round2(amount)],
            averageAmount: round2(amount),
            card: false,
            category: category === "Other" ? "Utilities" : category,
            createdAt: new Date().toISOString(),
            frequency: freq,
            lastPaid: date,
            latestAmount: round2(amount),
            nextDue:
              freq === "variable" ? addDays(date, 50) : addMonths(date, 1),
            occurrences: 1,
            settlements: [],
            title: rawTitle,
            uid: uid("r"),
          };
          recurrings.push(rec);
          recurringTracker.set(normKey, {
            entries: [{ amount: round2(amount), date }],
            recurringIdx: recurrings.length - 1,
          });
          seenRecurring.add(normKey);
        }
      }
    }

    txns.push({
      amount: round2(amount),
      category,
      createdAt: new Date().toISOString(),
      date,
      kind,
      note,
      payment: pebblePayment,
      uid: uid("t"),
    });
  }

  return { loans, recurrings, salaryHints, txns };
};

const printHelp = () => {
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

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const excelPath = args[0];
  if (!existsSync(excelPath)) {
    console.error(`❌ File not found: ${excelPath}`);
    process.exit(1);
  }

  const outIdx = args.indexOf("--out");
  const mergeIdx = args.indexOf("--merge");
  const dryRun = args.includes("--dry-run");
  const outPath =
    outIdx === -1
      ? `pebble-import-${isoDay(new Date())}.json`
      : args[outIdx + 1];
  const mergePath = mergeIdx === -1 ? null : args[mergeIdx + 1];

  console.log(`📖 Reading ${excelPath}...`);
  const wb = XLSX.readFile(excelPath);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    console.error("❌ No sheets");
    process.exit(1);
  }
  const sheet = wb.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  console.log(`📄 ${jsonRows.length} rows in "${sheetName}"`);

  const { txns, loans, recurrings, salaryHints } = convertRows(jsonRows);

  console.log(`\n💰 Parsed:`);
  console.log(`   - ${txns.length} transactions`);
  console.log(
    `     expense: ${txns.filter((t: any) => t.kind === "expense").length}, income: ${txns.filter((t: any) => t.kind === "income").length}`
  );
  console.log(`   - ${loans.length} lending/borrow`);
  console.log(`   - ${recurrings.length} bills/recurring`);
  if (salaryHints.length) {
    const avg =
      salaryHints.reduce((a: number, b: number) => a + b, 0) /
      salaryHints.length;
    console.log(`   - salary hints: ${salaryHints.length}, avg ${round2(avg)}`);
  }

  const byCat = new Map<string, number>();
  for (const t of txns) {
    if (t.kind === "expense") {
      byCat.set(t.category, (byCat.get(t.category) || 0) + t.amount);
    }
  }
  console.log(`\n📊 Where it went (expense by category):`);
  for (const [cat, amt] of [...byCat.entries()].toSorted(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`   - ${cat}: ${amt}`);
  }

  // Variable bills report
  const variableBills = recurrings.filter(
    (r: any) => r.occurrences > 1 || r.amounts?.length > 1
  );
  if (variableBills.length) {
    console.log(`\n⚡ Variable bills (same title, different amounts):`);
    for (const rb of variableBills) {
      console.log(
        `   - ${rb.title}: amounts=${JSON.stringify(rb.amounts)} avg=${rb.averageAmount} latest=${rb.latestAmount} lastPaid=${rb.lastPaid} nextDue=${rb.nextDue}`
      );
    }
  }

  if (dryRun) {
    console.log("\n--- Dry run preview ---");
    console.log(
      JSON.stringify(
        {
          loans: loans.slice(0, 3),
          recurrings: recurrings.slice(0, 5),
          txns: txns.slice(0, 5),
        },
        null,
        2
      )
    );
    return;
  }

  let finalBackup: any = {
    app: "pebble",
    deviceId: "local",
    exportedAt: new Date().toISOString(),
    loans,
    promises: [],
    recurrings,
    settings: {
      budgets: {},
      currency: "₹",
      expectedSalary: salaryHints.length
        ? round2(salaryHints.reduce((a, b) => a + b, 0) / salaryHints.length)
        : 0,
      incomeAcks: {},
      lastBackupAt: "",
      name: "Friend",
      payday: 1,
    },
    transactions: txns,
    version: 2,
  };

  if (mergePath) {
    if (!existsSync(mergePath)) {
      console.error(`❌ Merge file not found: ${mergePath}`);
      process.exit(1);
    }
    console.log(`\n🔗 Merging with ${mergePath}...`);
    const existingRaw = await readFile(mergePath, "utf-8");
    const existing = JSON.parse(existingRaw);
    const existingTxns = existing.transactions || [];
    const existingLoans = existing.loans || [];
    const existingRec = existing.recurrings || [];

    const seenTxn = new Set(
      existingTxns.map(
        (t: any) => `${t.date}|${t.amount}|${t.note.slice(0, 50)}`
      )
    );
    let addedTxn = 0;
    for (const t of txns) {
      const key = `${t.date}|${t.amount}|${t.note.slice(0, 50)}`;
      if (!seenTxn.has(key)) {
        existingTxns.push(t);
        seenTxn.add(key);
        addedTxn++;
      }
    }

    const seenLoan = new Set(
      existingLoans.map((l: any) => `${l.date}|${l.amount}|${l.person}`)
    );
    let addedLoan = 0;
    for (const l of loans) {
      const key = `${l.date}|${l.amount}|${l.person}`;
      if (!seenLoan.has(key)) {
        existingLoans.push(l);
        seenLoan.add(key);
        addedLoan++;
      }
    }

    // Variable bill aware merge: dedup by title only, not title+amount - ponytail: reuse normalize, stdlib
    const seenRec = new Map<string, number>();
    existingRec.forEach((r: any, idx: number) => {
      const k = r.title.toLowerCase().replaceAll(/\s+/g, " ").trim();
      seenRec.set(k, idx);
    });
    const isGas = (title: string) => {
      const lower = title.toLowerCase();
      return (
        (lower.includes("gas") &&
          (lower.includes("cylinder") || lower.includes("lpg"))) ||
        lower.includes("gas cylinder")
      );
    };
    const addDaysLocal = (dateStr: string, days: number) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d + days);
      return isoDay(dt);
    };
    let addedRec = 0;
    for (const r of recurrings) {
      const key = r.title.toLowerCase().replaceAll(/\s+/g, " ").trim();
      if (key === "credit card bill") {
        const ex = existingRec.find((x: any) => x.card);
        if (ex) {
          ex.settlements = [
            ...(ex.settlements || []),
            ...(r.settlements || []),
          ].toSorted((a: any, b: any) =>
            a.date < b.date ? -1 : a.date > b.date ? 1 : 0
          );
          const latestSettle = ex.settlements.at(-1);
          const all = ex.settlements.map((s: any) => s.amount);
          ex.amount = round2(
            all.reduce((a: number, b: number) => a + b, 0) / all.length
          );
          ex.averageAmount = ex.amount;
          ex.latestAmount = round2(latestSettle.amount);
          ex.lastPaid = latestSettle.date;
          ex.nextDue = addMonths(ex.lastPaid, 1);
          ex.occurrences = all.length;
          ex.amounts = [...all];
        } else {
          existingRec.push(r);
          addedRec++;
        }
        continue;
      }
      if (seenRec.has(key)) {
        const idx = seenRec.get(key)!;
        const ex = existingRec[idx];
        // Merge and sort by date to get correct latest - fixes gas cylinder showing Mar 6 instead of Sep 3
        const allAmounts = [
          ...(ex.amounts || [ex.amount]),
          ...(r.amounts || [r.amount]),
        ];
        const allDates = [ex.lastPaid, r.lastPaid]
          .filter(Boolean)
          .toSorted((a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0));
        const latestDate = allDates.at(-1) || ex.lastPaid || r.lastPaid;
        const avg =
          allAmounts.reduce((a: number, b: number) => a + b, 0) /
          allAmounts.length;
        const latestAmt =
          latestDate === r.lastPaid
            ? r.latestAmount
            : latestDate === ex.lastPaid
              ? ex.latestAmount
              : r.latestAmount;
        ex.amounts = allAmounts;
        ex.averageAmount = round2(avg);
        ex.amount = round2(avg);
        ex.latestAmount = round2(latestAmt ?? r.latestAmount);
        ex.lastPaid = latestDate;
        ex.occurrences = allAmounts.length;
        const variable =
          isGas(ex.title) ||
          isGas(r.title) ||
          ex.frequency === "variable" ||
          r.frequency === "variable";
        ex.frequency = variable ? "variable" : ex.frequency;
        ex.nextDue = variable
          ? addDaysLocal(latestDate, 50)
          : addMonths(latestDate, 1);
      } else {
        existingRec.push(r);
        seenRec.set(key, existingRec.length - 1);
        addedRec++;
      }
    }

    finalBackup = {
      ...existing,
      app: "pebble",
      exportedAt: new Date().toISOString(),
      loans: existingLoans,
      recurrings: existingRec,
      transactions: existingTxns,
      version: 2,
    };
    console.log(
      `✅ Added ${addedTxn} txns, ${addedLoan} loans, ${addedRec} recurrings (variable bills merged by title)`
    );
  }

  await writeFile(outPath, JSON.stringify(finalBackup, null, 2), "utf-8");
  console.log(`\n✅ Wrote to ${outPath}`);
  console.log(
    `   - ${finalBackup.transactions.length} txns, ${finalBackup.loans.length} loans, ${finalBackup.recurrings.length} bills`
  );
  console.log(`   Import via Pebble > Care > Data > Restore from file`);
  console.log(
    `\nponytail: variable bills dedup by title, avg/latest tracking, Health mapping, reuse parser`
  );
};

main().catch((error) => {
  console.error("❌", error);
  process.exit(1);
});
