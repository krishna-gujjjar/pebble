/**
 * Specialized Financial Parsing Engine
 * Converts raw bank transaction text into clean JSON
 *
 * Strict Rule: Use user_remark as primary source for expense_category if exists,
 * else use counterparty name.
 *
 * Account holder suffix "00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD" is ignored.
 */

export type TransactionType = "INFLOW" | "OUTFLOW";
export type PaymentMethod = "UPI" | "NEFT" | "IMPS" | "ATM" | "CASH" | "OTHER";

export interface ParsedTransaction {
  transaction_type: TransactionType;
  payment_method: PaymentMethod;
  counterparty: string;
  user_remark: string;
  expense_category: string;
  clean_note: string;
  is_bill: boolean;
  is_recurring_candidate: boolean;
  is_lending: boolean;
  is_salary: boolean;
}

// Bank codes to ignore when extracting remark
const BANK_CODES = new Set([
  "KKBK",
  "HDFC",
  "YESB",
  "UTIB",
  "AXODH",
  "ICIC",
  "SBIN",
  "PUNB",
  "BARB",
  "CNRB",
  "FDRL",
  "IDIB",
  "IOBA",
  "BKID",
  "CBIN",
  "UBIN",
  "UTBI",
  "SBI",
  "AXIS",
  "KOTAK",
]);

const BILL_KEYWORDS = [
  "BILL PAYMENT",
  "AIRTEL",
  "SBI CARDS",
  "CRED",
  "AMC",
  "CREDIT CARD",
  "ELECTRICITY",
  "WATER",
  "GAS",
  "BROADBAND",
  "MOBILE",
  "RECHARGE",
  "BIJLI",
  "CURRENT BILL",
  "JVVNL",
  "BSNL",
  "WATER BILL",
  "GAS BILL",
];
const SALARY_KEYWORDS = [
  "SALARY",
  "SAL ",
  "PAYROLL",
  "WAGES",
  "KRISCENT TECHNO",
  "TECHNO",
];
const LENDING_PERSON_PATTERN = /^[A-Z][A-Z\s.]{2,30}$/;

// Health & Medical specific rules per user spec
const HEALTH_DOCTOR_PREFIX = /^\s*DR[\s.]/i;
const HEALTH_BODY_PARTS = [
  "DIABETES",
  "DENTAL",
  "EYE",
  "HEART",
  "KIDNEY",
  "LIVER",
  "SKIN",
  "ORTHO",
  "GYNE",
  "PEDIATRIC",
  "ENT",
  "CARDIAC",
  "NEURO",
  "ONCO",
  "DERMA",
  "PHYSIO",
  "CHEST",
  "BLOOD",
  "SUGAR",
  "THYROID",
  "CANCER",
  "XRAY",
  "SCAN",
  "LAB",
  "PATHOLOGY",
  "CLINIC",
  "HOSPITAL",
];
const HEALTH_TRANSLITERATED = [
  "SWASTH",
  "SEVA",
  "AROGYA",
  "CHIKITSA",
  "AUSADHI",
  "DAWAI",
];
const HEALTH_SUFFIX_KEYWORDS = [
  "MEDI",
  "@/DR",
  "@DR",
  "MEDICAL",
  "PHARMA",
  "HEALTHCARE",
  "CLINIC",
  "HOSPITAL",
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Business: ["business", "techno", "kriscent", "deposit", "neft"],
  Dining: [
    "zomato",
    "swiggy",
    "restaurant",
    "cafe",
    "pizza",
    "dining",
    "food",
    "dominos",
    "burger",
    "biryani",
  ],
  Education: [
    "school",
    "college",
    "education",
    "course",
    "udemy",
    "coursera",
    "fees",
  ],
  Freelance: ["freelance", "project", "invoice", "consulting"],
  Fun: ["cinema", "movie", "pvr", "inox", "game", "fun", "entertainment"],
  Gift: ["gift", "present"],
  Groceries: [
    "grocery",
    "supermarket",
    "dmart",
    "bigbasket",
    "fresh",
    "vegetable",
    "kirana",
    "more",
    "reliance fresh",
  ],
  Health: [
    "pharmacy",
    "hospital",
    "medical",
    "doctor",
    "health",
    "apollo",
    "medplus",
    "medi",
    "dr ",
    "dr.",
    "diabetes",
    "dental",
    "eye",
    "swasth",
    "seva",
    "clinic",
    "lab",
    "pathology",
    "healthcare",
  ],
  Interest: ["interest", "int.", "int "],
  Lending: ["rishi", "purvika", "birla me", "cash", "lent", "borrow"],
  Refund: ["refund", "cashback", "reversal"],
  Rent: ["rent", "house rent", "accommodation"],
  Salary: ["salary", "payroll", "kriscent techno", "wages"],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "shopping",
    "store",
    "ajio",
    "nykaa",
    "purvika",
    "ipos",
    "vyapar",
    "birla",
    "retail",
    "mart",
    "paytmqr",
    "paytm",
    "qr",
    "ravi",
    "pooja",
  ],
  Subscriptions: [
    "netflix",
    "spotify",
    "music",
    "subscription",
    "prime",
    "youtube",
    "hotstar",
    "sonyliv",
    "gaana",
  ],
  Transport: [
    "uber",
    "ola",
    "metro",
    "fuel",
    "petrol",
    "irctc",
    "ride",
    "auto",
    "cab",
    "rapido",
  ],
  Travel: [
    "hotel",
    "flight",
    "travel",
    "makemytrip",
    "booking",
    "goibibo",
    "irctc",
    "oyO",
  ],
  Utilities: [
    "airtel",
    "jio",
    "vodafone",
    "bsnl",
    "electricity",
    "water",
    "gas",
    "broadband",
    "mobile",
    "recharge",
    "bill payment",
    "airtel-bil",
    "electric",
    "internet",
    "bijli",
    "current bill",
  ],
};

const extractSuffixHandleArea = (rawInput: string): string => {
  // Get text right before location string "AT 31254..."
  const match = rawInput.match(/^(.*)\s+(?:0+X+|\d+X+|\d+)\s+AT\s+31254/i);
  if (match) {
    const before = match[1];
    // Return last 100 chars as suffix/handle area
    return before.slice(-120);
  }
  // Fallback: text after last slash before AT
  const beforeAT = rawInput.split(/AT\s+31254/i)[0] || "";
  const parts = beforeAT.split("/");
  return parts.slice(-2).join("/").slice(-100);
};

const wordBoundaryContains = (text: string, keyword: string): boolean => {
  // Escape regex
  const escaped = keyword.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // For very short keywords (<=3), require word boundary both sides
  // For longer, allow prefix match but still word boundary start
  const pattern = keyword.length <= 3 ? `\\b${escaped}\\b` : `\\b${escaped}`;
  try {
    return new RegExp(pattern, "i").test(text);
  } catch {
    return text.toUpperCase().includes(keyword);
  }
};

const checkHealthMedical = (
  counterparty: string,
  rawInput: string,
  suffixArea: string
): string | null => {
  const cp = counterparty.trim();
  const cpUpper = cp.toUpperCase();
  const suffixLower = suffixArea.toLowerCase();
  const suffixUpper = suffixArea.toUpperCase();

  // Rule 1: Counterparty begins with DR or DR.
  if (HEALTH_DOCTOR_PREFIX.test(cp)) {
    return "Health & Medical (Doctor Consultation)";
  }

  // Rule 1b: Contains medical conditions or body parts - use word boundaries to avoid PAYMENT -> ENT false positive
  for (const cond of HEALTH_BODY_PARTS) {
    if (wordBoundaryContains(cp, cond)) {
      if (HEALTH_DOCTOR_PREFIX.test(cp)) {
        return "Health & Medical (Doctor Consultation)";
      }
      return "Health & Medical";
    }
  }

  // Rule 1c: Transliterated health keywords - word boundary
  for (const kw of HEALTH_TRANSLITERATED) {
    if (wordBoundaryContains(cp, kw)) {
      return "Health & Medical";
    }
  }

  // Rule 2: Suffix/handle area contains Medi or @/dr
  // For suffix, "Medi" as substring is allowed per spec, but avoid matching "immediate" etc? Keep substring but ensure not too generic
  // Check explicit patterns: medi followed by word char, or @/dr
  // Per spec: suffix/handle area right before location string contains "Medi" or "@/dr"
  // Check for medi substring (medical, medicine, etc) - but ensure it's in handle area, not UPI prefix
  // Also check @/dr pattern specifically
  if (suffixLower.includes("medi")) {
    return "Health & Medical";
  }
  // Check for @/dr or @dr patterns (doctor handle)
  if (suffixLower.includes("@/dr") || suffixLower.includes("@dr")) {
    return "Health & Medical";
  }
  // Check other medical suffix keywords but only if in handle area (after last /)
  // Extract handle part: after last / before AT
  const handlePart = suffixArea.split("/").pop() || suffixArea;
  const handleUpper = handlePart.toUpperCase();
  for (const kw of HEALTH_SUFFIX_KEYWORDS) {
    if (kw === "MEDI" || kw === "@/DR" || kw === "@DR") {
      continue;
    } // already handled
    if (handleUpper.includes(kw) || suffixUpper.includes(kw)) {
      // For generic medical words in suffix, require word boundary to avoid false positives
      if (
        ["MEDICAL", "PHARMA", "HEALTHCARE", "CLINIC", "HOSPITAL"].includes(kw)
      ) {
        if (wordBoundaryContains(suffixArea, kw)) {
          return "Health & Medical";
        }
      }
    }
  }

  return null;
};

const getCategoryFromText = (
  text: string,
  type: TransactionType,
  counterparty?: string,
  rawInput?: string
): string => {
  const lower = text.toLowerCase();

  // First, check Health & Medical specific rules if counterparty and raw provided
  if (counterparty && rawInput) {
    const suffix = extractSuffixHandleArea(rawInput);
    const healthCat = checkHealthMedical(counterparty, rawInput, suffix);
    if (healthCat) {
      return healthCat;
    }
    // Also check the text itself for health if it contains DR prefix
    if (HEALTH_DOCTOR_PREFIX.test(text)) {
      return "Health & Medical (Doctor Consultation)";
    }
    // Check suffix area for health even if counterparty didn't match
    for (const kw of HEALTH_SUFFIX_KEYWORDS) {
      if (suffix.toUpperCase().includes(kw)) {
        return "Health & Medical";
      }
    }
  }

  // Check all categories, prefer remark first
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      if (type === "INFLOW") {
        if (cat === "Salary" || lower.includes("salary")) {
          return "Salary";
        }
        if (
          ["Business", "Freelance", "Interest", "Gift", "Refund"].includes(cat)
        ) {
          return cat;
        }
        if (cat === "Salary") {
          return "Salary";
        }
      }
      if (
        [
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
        ].includes(cat)
      ) {
        // Map Health & Medical variants to Health for general, but keep detailed if doctor
        if (cat === "Health") {
          // Preserve detailed health categories if already detected
          if (lower.includes("dr ") || lower.includes("dr.")) {
            return "Health & Medical (Doctor Consultation)";
          }
          return "Health & Medical";
        }
        return cat;
      }
      if (cat === "Business" && type === "OUTFLOW") {
        return "Other";
      }
      return cat;
    }
  }
  return "Other";
};

const cleanAccountHolder = (raw: string): string => {
  let s = raw;
  // Remove account holder suffix "00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD" or similar
  // Pattern: optional digits/X, AT, 31254, KOTAH ... ROAD
  s = s.replaceAll(/\s*0+X+\s+AT\s+31254\s+KOTAH.*$/gi, "");
  s = s.replaceAll(/\s*\d+X+\s+AT\s+31254\s+KOTAH.*$/gi, "");
  s = s.replaceAll(/\s+\d+\s+AT\s+31254\s+KOTAH.*$/gi, ""); // For UPI ref number AT ...
  s = s.replaceAll(/\s+AT\s+31254\s+KOTAH.*$/gi, ""); // Generic AT 31254...
  s = s.replaceAll(/\s+\d+X+\s+AT\s+.*ROAD\s*$/gi, "").trim();
  s = s.replaceAll(/\s+AT\s+.*ROAD\s*$/gi, "").trim(); // Fallback any AT ... ROAD at end
  return s.trim();
};

const stripPrefixes = (text: string): string =>
  text
    .replaceAll(/^\s*(WDL|DEP)\s+TFR\s+/gi, "")
    .replaceAll(/^\s*DEBIT\s+/gi, "")
    .trim();

const extractUPI = (text: string) => {
  // Find UPI/DR/... pattern inside text, also handle UP/DR as UPI alias (bank statements use UP)
  const upiRegex =
    /(?:UPI|UP)\/(DR|CR)\/([^/]+)\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/i;
  const m = text.match(upiRegex);
  if (m) {
    // m[3] = counterparty, m[4]=bank, m[5]=remark
    let counterparty = m[3].trim();
    let remark = (m[5] || m[4] || "").trim();
    // If remark is bank code, treat as empty and try to get remark from remaining text after match
    const afterMatch = text.slice((m.index || 0) + m[0].length).trim();
    if (
      BANK_CODES.has(remark.toUpperCase()) ||
      /^\d+$/.test(remark) ||
      remark.length <= 3
    ) {
      // Use afterMatch as remark if it exists and not bank
      if (
        afterMatch &&
        !BANK_CODES.has(afterMatch.toUpperCase().split(/\s+/)[0])
      ) {
        remark = afterMatch;
      } else {
        remark = "";
      }
    } else {
      // Combine with afterMatch if present
      if (afterMatch) {
        remark = `${remark} ${afterMatch}`.trim();
      }
    }
    // Special: if counterparty contains bank code like KKBK, it might be wrong
    // Try to detect: if counterparty is like "RISHI ." -> good, but if it's "1XXXXXXXXXXX" it's id
    if (
      /^\d+X+$/.test(counterparty) ||
      /^\d+$/.test(counterparty) ||
      BANK_CODES.has(counterparty.toUpperCase())
    ) {
      counterparty = "";
    }
    // Clean
    counterparty = counterparty
      .replaceAll(/[^A-Z0-9\s.-]/gi, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
    remark = remark
      .replaceAll(/[^A-Z0-9\s.-]/gi, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
    // If remark contains "X/cash" or "paym" or "bil" keep
    return { bank: m[4] || "", counterparty, remark };
  }
  // Fallback split method for cases like "UPI/DR/6XXX/RISHI ./KKBK/..." or "UP/DR/..."
  const parts = text
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  const upiIdx = parts.findIndex(
    (p) => p.toUpperCase() === "UPI" || p.toUpperCase() === "UP"
  );
  if (upiIdx !== -1 && parts.length >= upiIdx + 4) {
    const counterparty = parts[upiIdx + 3].replace(/^\d+/, "").trim();
    const remaining = parts
      .slice(upiIdx + 4)
      .join(" ")
      .trim();
    const tokens = remaining
      .split(/\s+/)
      .filter((t) => !BANK_CODES.has(t.toUpperCase()) && !/^\d+X+$/.test(t));
    const remark = tokens.join(" ").trim();
    return { bank: parts[upiIdx + 4] || "", counterparty, remark };
  }
  return null;
};

const extractNEFT = (text: string) => {
  // NEFT*...*...*COUNTERPARTY
  if (text.includes("NEFT")) {
    const parts = text
      .split("*")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts.at(-1);
    // Counterparty may have two words split by newline: "KRISCENT \n TECHNO" -> "KRISCENT TECHNO"
    return { counterparty: last, remark: "" };
  }
  return null;
};

const extractIMPS = (text: string) => {
  if (text.includes("IMPS")) {
    const parts = text
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    // IMPS/<id>/<counterparty with - >
    if (parts.length >= 3) {
      let cp = parts[2];
      let remark = parts[3] || "";
      // Handle "IPOS-xx298-PURVIKA " -> extract PURVIKA
      if (cp.includes("-")) {
        const sub = cp.split("-");
        // Last part that is alphabetic and not numbers is likely name
        const nameCandidate =
          sub.filter((s) => /[A-Z]{3,}/i.test(s)).pop() || sub.at(-1);
        if (nameCandidate) {
          remark = remark || cp;
          cp = nameCandidate.replaceAll(/[^A-Z\s]/gi, "").trim();
        }
      }
      return { counterparty: cp, remark };
    }
  }
  return null;
};

export const parseTransactionText = (rawInput: string): ParsedTransaction => {
  const withoutAccount = cleanAccountHolder(rawInput);
  const stripped = stripPrefixes(withoutAccount);
  const normalized = stripped.replaceAll(/\s+/g, " ").trim();
  const upper = normalized.toUpperCase();

  // Determine type from original raw (DEP vs WDL) before stripping
  let transaction_type: TransactionType = "OUTFLOW";
  const rawUpper = rawInput.toUpperCase();
  if (
    rawUpper.includes("DEP TFR") ||
    rawUpper.includes("/CR/") ||
    rawUpper.includes(" CR ") ||
    rawUpper.trim().startsWith("DEP")
  ) {
    transaction_type = "INFLOW";
  } else if (
    rawUpper.includes("WDL TFR") ||
    rawUpper.includes("/DR/") ||
    rawUpper.includes("DEBIT")
  ) {
    transaction_type = "OUTFLOW";
  }

  // Determine payment method - UP is alias for UPI in some bank statements
  let payment_method: PaymentMethod = "OTHER";
  if (
    upper.includes("UPI") ||
    upper.match(/\bUP\/DR\b/) ||
    upper.match(/\bUP\/CR\b/)
  ) {
    payment_method = "UPI";
  } else if (upper.includes("NEFT")) {
    payment_method = "NEFT";
  } else if (upper.includes("IMPS")) {
    payment_method = "IMPS";
  } else if (upper.includes("ATMCARD") || upper.includes("ATM")) {
    payment_method = "ATM";
  } else if (upper.includes("CASH") || upper.includes("X/CASH")) {
    payment_method = "CASH";
  }

  let counterparty = "";
  let user_remark = "";

  // Try parsers in order - UPI first
  const upi = extractUPI(normalized);
  if (upi && upi.counterparty) {
    counterparty = upi.counterparty;
    user_remark = upi.remark;
  } else {
    const neft = extractNEFT(normalized);
    if (neft) {
      counterparty = neft.counterparty;
      user_remark = neft.remark;
    } else {
      const imps = extractIMPS(normalized);
      if (imps) {
        counterparty = imps.counterparty;
        user_remark = imps.remark;
      } else {
        // OF pattern: "00XXXXXXXXXXX OF SBI CARDS AND PAYMENT" or "XXXX OF <counterparty>"
        if (upper.includes(" OF ")) {
          const ofParts = normalized.split(/\s+OF\s+/i);
          const afterOf = ofParts.at(-1).trim();
          // If afterOf contains SBI CARDS, use that
          if (afterOf.toUpperCase().includes("SBI CARDS")) {
            counterparty = "SBI CARDS AND PAYMENT";
            user_remark = "Credit Card Bill";
          } else {
            counterparty = afterOf.split(/\s+AT\s+/i)[0].trim();
            user_remark = "";
          }
        } else if (upper.includes("BILL PAYMENT")) {
          counterparty = "Bill Payment";
          const after = normalized.split(/BILL PAYMENT/i)[1] || "";
          user_remark = after.replaceAll(/[-_]/g, " ").trim().slice(0, 80);
          if (!user_remark) {
            user_remark = "Bill Payment";
          }
        } else if (upper.includes("SBI CARDS")) {
          counterparty = "SBI CARDS AND PAYMENT";
          user_remark = "Credit Card Bill";
        } else if (upper.includes("ATMCARD") || upper.includes("AMC")) {
          // DEBIT ATMCard AMC
          const amcMatch = normalized.match(/AMC\s+([\d*]+)/i);
          counterparty = "AMC";
          user_remark = amcMatch ? `AMC Fee ${amcMatch[1]}` : "ATM Card AMC";
        } else {
          // Fallback: take last meaningful chunk that is not bank code or id
          const tokens = normalized
            .split(/\s+/)
            .filter(
              (t) =>
                t.length > 2 &&
                !BANK_CODES.has(t.toUpperCase()) &&
                !/^[\dX*]+$/.test(t)
            );
          counterparty = tokens.slice(-3).join(" ").slice(0, 60) || "Unknown";
          user_remark = "";
        }
      }
    }
  }

  // Clean counterparty and remark
  counterparty = counterparty
    .replaceAll(/[^A-Z0-9\s.-]/gi, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  user_remark = user_remark
    .replaceAll(/[^A-Z0-9\s.-]/gi, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  // If counterparty is still empty or looks like bank code, try to extract from remark
  if (
    !counterparty ||
    BANK_CODES.has(counterparty.toUpperCase()) ||
    /^\d+$/.test(counterparty)
  ) {
    counterparty = user_remark || "Unknown";
    user_remark = "";
  }

  // Special cleanups
  if (
    counterparty.toUpperCase().includes("KKBK") ||
    counterparty.toUpperCase().includes("YESB")
  ) {
    counterparty = user_remark || counterparty;
  }

  // Determine category - strict rule: remark primary, else counterparty
  // Also apply Health & Medical specific rules using counterparty and rawInput
  const primaryForCategory = user_remark || counterparty;
  let expense_category = getCategoryFromText(
    primaryForCategory,
    transaction_type,
    counterparty,
    rawInput
  );

  // If remark exists but category still Other, try counterparty
  if (expense_category === "Other" && user_remark && counterparty) {
    const alt = getCategoryFromText(
      counterparty,
      transaction_type,
      counterparty,
      rawInput
    );
    if (alt !== "Other") {
      expense_category = alt;
    }
  }

  // Final health check directly on counterparty + suffix (even if primary was Other)
  if (expense_category === "Other" || expense_category === "Shopping") {
    const suffix = extractSuffixHandleArea(rawInput);
    const healthDirect = checkHealthMedical(counterparty, rawInput, suffix);
    if (healthDirect) {
      expense_category = healthDirect;
    }
  }

  // Salary override
  const is_salary = SALARY_KEYWORDS.some((k) => upper.includes(k));
  if (is_salary && transaction_type === "INFLOW") {
    expense_category = "Salary";
  }

  // Bill detection
  const is_bill = BILL_KEYWORDS.some(
    (k) =>
      upper.includes(k) ||
      counterparty.toUpperCase().includes(k) ||
      user_remark.toUpperCase().includes(k)
  );

  // Recurring candidate if bill or subscription
  const is_recurring_candidate =
    is_bill ||
    ["Utilities", "Subscriptions", "Rent"].includes(expense_category);

  // Lending detection: strict - person name, outflow, UPI/IMPS, remark is cash/empty/lent/borrow, not shopping/business
  const isPerson =
    LENDING_PERSON_PATTERN.test(counterparty.toUpperCase()) &&
    !BILL_KEYWORDS.some((k) => counterparty.toUpperCase().includes(k));
  const lowerRemark = user_remark.toLowerCase();
  const lowerCounter = counterparty.toLowerCase();
  const shoppingHints = [
    "deposit",
    "vyapar",
    "retail",
    "shop",
    "store",
    "purchase",
    "purvika",
    "birla",
    "amazon",
    "flipkart",
  ];
  const isShoppingHint = shoppingHints.some(
    (k) => lowerRemark.includes(k) || lowerCounter.includes(k)
  );
  const isCashHint =
    lowerRemark.includes("cash") ||
    lowerRemark === "" ||
    lowerRemark.includes("lent") ||
    lowerRemark.includes("borrow") ||
    lowerRemark.includes("x cash");
  const is_lending =
    isPerson &&
    (payment_method === "UPI" || payment_method === "IMPS") &&
    transaction_type === "OUTFLOW" &&
    !is_bill &&
    isCashHint &&
    !isShoppingHint;

  const clean_note =
    `${counterparty}${user_remark ? ` - ${user_remark}` : ""}`.trim();

  return {
    clean_note,
    counterparty: counterparty || "Unknown",
    expense_category,
    is_bill,
    is_lending,
    is_recurring_candidate,
    is_salary,
    payment_method,
    transaction_type,
    user_remark,
  };
};

// Test harness for the examples given
if (import.meta.main) {
  const examples = [
    " DEP TFR   NEFT*XXXXXXXXXXX*AXODHXXXXXXXXXXX*KRISCENT \n TECHNO   00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
    " WDL TFR   UPI/DR/6XXXXXXXXXXX/RISHI ./KKBK/XXXXXXXXX\n X/cash   00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
    " DEBIT   ATMCard \n AMC  459178*8105",
    " WDL TFR   IY2250202611XXXXXXXXXXX   00XXXXXXXXXXX OF\n  SBI CARDS AND PAYMENT AT 31254 KOTAH RAJ BHAWAN ROAD",
    " WDL TFR   Bill Payment-SB4162500XXXXXXXXXXX  \n  00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
    " WDL TFR   UPI/DR/1XXXXXXXXXXX/Airtel/YESB/airtel-bil/\n Airtel   00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
    " WDL TFR   UPI/DR/1XXXXXXXXXXX/CRED UTI/UTIB/cred.util\n i/paym   00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
    " WDL TFR   IMPS/6XXXXXXXXXXX/IPOS-xx298-PURVIKA /Dep\n osit   00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
    " WDL TFR   UPI/DR/6XXXXXXXXXXX/BIRLA ME/HDFC/vyapar.1\n 72/UPI   00XXXXXXXXXXX AT 31254 KOTAH RAJ BHAWAN ROAD",
  ];

  console.log("Testing financial parser with provided examples:\n");
  for (const ex of examples) {
    console.log(`Input: ${ex.replaceAll(/\s+/g, " ").slice(0, 80)}...`);
    console.log(JSON.stringify(parseTransactionText(ex), null, 2));
    console.log("---");
  }
}
