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
const LENDING_PERSON_PATTERN = /^[A-Z][A-Z\s.]{2,30}$/u;

// Health & Medical specific rules per user spec
const HEALTH_DOCTOR_PREFIX = /^\s*DR[\s.]/iu;
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

const CATEGORY_KEYWORDS = {
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
} as const satisfies Record<string, readonly string[]>;

const HEALTH_CATEGORY = "Health & Medical";
const DOCTOR_CONSULTATION_CATEGORY = "Health & Medical (Doctor Consultation)";
const OTHER_CATEGORY = "Other";
const SALARY_CATEGORY = "Salary";
const BUSINESS_CATEGORY = "Business";
const HEALTH_KEYWORD_CATEGORY = "Health";
const INCOME_CATEGORY_NAMES = new Set([
  BUSINESS_CATEGORY,
  "Freelance",
  "Interest",
  "Gift",
  "Refund",
]);
const EXPENSE_CATEGORY_NAMES = new Set([
  "Groceries",
  "Dining",
  "Transport",
  "Rent",
  "Utilities",
  "Subscriptions",
  "Shopping",
  HEALTH_KEYWORD_CATEGORY,
  "Fun",
  "Travel",
  "Education",
  OTHER_CATEGORY,
]);
const GENERIC_HEALTH_SUFFIX_KEYWORDS = new Set([
  "MEDICAL",
  "PHARMA",
  "HEALTHCARE",
  "CLINIC",
  "HOSPITAL",
]);

interface TextToken {
  end: number;
  start: number;
  value: string;
}

const tokenizeWhitespace = (text: string): TextToken[] => {
  const tokens: TextToken[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    while (/\s/u.test(text[cursor] ?? "")) {
      cursor += 1;
    }
    const start = cursor;
    while (cursor < text.length && !/\s/u.test(text[cursor] ?? "")) {
      cursor += 1;
    }
    if (start < cursor) {
      tokens.push({
        end: cursor,
        start,
        value: text.slice(start, cursor),
      });
    }
  }
  return tokens;
};

const isAccountReferenceToken = (
  token: string,
  requireMask = false
): boolean => {
  let hasDigit = false;
  let hasMask = false;
  for (const character of token.toUpperCase()) {
    if (character >= "0" && character <= "9") {
      if (hasMask) {
        return false;
      }
      hasDigit = true;
    } else if (character === "X" && hasDigit) {
      hasMask = true;
    } else {
      return false;
    }
  }
  return hasDigit && (!requireMask || hasMask);
};

const findLocationMarkerIndex = (tokens: TextToken[]): number => {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    const followingToken = tokens[index + 1];
    if (
      token?.value.toUpperCase() === "AT" &&
      followingToken?.value.startsWith("31254")
    ) {
      return index;
    }
  }
  return -1;
};

const extractSuffixHandleArea = (rawInput: string): string => {
  // Get text right before location string "AT 31254..."
  const tokens = tokenizeWhitespace(rawInput);
  let prefixEnd: number | undefined;
  for (let index = 0; index < tokens.length - 2; index += 1) {
    const accountToken = tokens[index];
    const atToken = tokens[index + 1];
    const locationToken = tokens[index + 2];
    const hasSuffixAccount = Boolean(
      accountToken &&
      accountToken.start > 0 &&
      isAccountReferenceToken(accountToken.value)
    );
    const hasLocationMarker =
      atToken?.value.toUpperCase() === "AT" &&
      Boolean(locationToken?.value.startsWith("31254"));
    if (hasSuffixAccount && hasLocationMarker && accountToken) {
      prefixEnd = accountToken.start - 1;
    }
  }
  if (prefixEnd !== undefined) {
    return rawInput.slice(0, prefixEnd).slice(-120);
  }

  // Fallback: text after last slash before AT
  const locationIndex = findLocationMarkerIndex(tokens);
  const beforeAT =
    locationIndex === -1
      ? rawInput
      : rawInput.slice(0, tokens[locationIndex]?.start);
  const parts = beforeAT.split("/");
  return parts.slice(-2).join("/").slice(-100);
};

const wordBoundaryContains = (text: string, keyword: string): boolean => {
  const escaped = keyword.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = keyword.length <= 3 ? `\\b${escaped}\\b` : `\\b${escaped}`;
  try {
    return new RegExp(pattern, "iu").test(text);
  } catch {
    return text.toUpperCase().includes(keyword);
  }
};

const checkHealthMedical = (
  counterparty: string,
  suffixArea: string
): string | null => {
  const cp = counterparty.trim();
  const suffixLower = suffixArea.toLowerCase();
  const suffixUpper = suffixArea.toUpperCase();

  if (HEALTH_DOCTOR_PREFIX.test(cp)) {
    return DOCTOR_CONSULTATION_CATEGORY;
  }

  for (const condition of HEALTH_BODY_PARTS) {
    if (wordBoundaryContains(cp, condition)) {
      return HEALTH_CATEGORY;
    }
  }

  for (const keyword of HEALTH_TRANSLITERATED) {
    if (wordBoundaryContains(cp, keyword)) {
      return HEALTH_CATEGORY;
    }
  }

  if (suffixLower.includes("medi")) {
    return HEALTH_CATEGORY;
  }
  if (suffixLower.includes("@/dr") || suffixLower.includes("@dr")) {
    return HEALTH_CATEGORY;
  }

  const handlePart = suffixArea.split("/").at(-1) || suffixArea;
  const handleUpper = handlePart.toUpperCase();
  const matchesGenericSuffix = [...GENERIC_HEALTH_SUFFIX_KEYWORDS].some(
    (keyword) =>
      (handleUpper.includes(keyword) || suffixUpper.includes(keyword)) &&
      wordBoundaryContains(suffixArea, keyword)
  );
  return matchesGenericSuffix ? HEALTH_CATEGORY : null;
};

const getSpecificHealthCategory = (
  text: string,
  counterparty: string,
  rawInput: string
): string | null => {
  const suffix = extractSuffixHandleArea(rawInput);
  const healthCategory = checkHealthMedical(counterparty, suffix);
  if (healthCategory) {
    return healthCategory;
  }
  if (HEALTH_DOCTOR_PREFIX.test(text)) {
    return DOCTOR_CONSULTATION_CATEGORY;
  }
  return HEALTH_SUFFIX_KEYWORDS.some((keyword) =>
    suffix.toUpperCase().includes(keyword)
  )
    ? HEALTH_CATEGORY
    : null;
};

const getCategoryForKeywordMatch = (
  category: string,
  type: TransactionType,
  lowerText: string
): string => {
  if (type === "INFLOW") {
    if (category === SALARY_CATEGORY || lowerText.includes("salary")) {
      return SALARY_CATEGORY;
    }
    if (INCOME_CATEGORY_NAMES.has(category)) {
      return category;
    }
  }

  if (EXPENSE_CATEGORY_NAMES.has(category)) {
    if (category === HEALTH_KEYWORD_CATEGORY) {
      return lowerText.includes("dr ") || lowerText.includes("dr.")
        ? DOCTOR_CONSULTATION_CATEGORY
        : HEALTH_CATEGORY;
    }
    return category;
  }
  if (category === BUSINESS_CATEGORY && type === "OUTFLOW") {
    return OTHER_CATEGORY;
  }
  return category;
};

const getCategoryFromText = (
  text: string,
  type: TransactionType,
  counterparty: string,
  rawInput: string
): string => {
  const lowerText = text.toLowerCase();
  if (counterparty && rawInput) {
    const healthCategory = getSpecificHealthCategory(
      text,
      counterparty,
      rawInput
    );
    if (healthCategory) {
      return healthCategory;
    }
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchesKeyword = keywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
    if (matchesKeyword) {
      return getCategoryForKeywordMatch(category, type, lowerText);
    }
  }
  return OTHER_CATEGORY;
};

const cleanAccountHolder = (raw: string): string => {
  const tokens = tokenizeWhitespace(raw);
  const endsWithRoad = raw.trimEnd().toUpperCase().endsWith("ROAD");

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const atToken = tokens[index];
    const locationCode = tokens[index + 1];
    if (
      !atToken ||
      atToken.value.toUpperCase() !== "AT" ||
      atToken.start === 0
    ) {
      continue;
    }

    const locationName = tokens[index + 2];
    const isKotahLocation =
      locationCode?.value === "31254" &&
      locationName?.value.toUpperCase().startsWith("KOTAH");
    if (isKotahLocation) {
      const accountToken = tokens[index - 1];
      const removeFrom =
        accountToken &&
        accountToken.start > 0 &&
        isAccountReferenceToken(accountToken.value)
          ? accountToken.start - 1
          : atToken.start - 1;
      return raw.slice(0, removeFrom).trimEnd();
    }

    if (endsWithRoad) {
      const accountToken = tokens[index - 1];
      const removeFrom =
        accountToken &&
        accountToken.start > 0 &&
        isAccountReferenceToken(accountToken.value, true)
          ? accountToken.start - 1
          : atToken.start - 1;
      return raw.slice(0, removeFrom).trimEnd();
    }
  }

  return raw.trim();
};

const stripPrefixes = (text: string): string =>
  text
    .replaceAll(/^\s*(?:WDL|DEP)\s+TFR\s+/giu, "")
    .replaceAll(/^\s*DEBIT\s+/giu, "")
    .trim();

interface PartyDetails {
  bank: string;
  counterparty: string;
  remark: string;
}

const resolveUPIRemark = (
  initialRemark: string,
  afterMatch: string
): string => {
  const looksLikeBankOrReference =
    BANK_CODES.has(initialRemark.toUpperCase()) ||
    /^\d+$/u.test(initialRemark) ||
    initialRemark.length <= 3;
  if (looksLikeBankOrReference) {
    const firstToken = afterMatch.toUpperCase().split(/\s+/u)[0] ?? "";
    return afterMatch && !BANK_CODES.has(firstToken) ? afterMatch : "";
  }
  return afterMatch ? `${initialRemark} ${afterMatch}`.trim() : initialRemark;
};

const isInvalidUPICounterparty = (counterparty: string): boolean =>
  /^\d+X+$/u.test(counterparty) ||
  /^\d+$/u.test(counterparty) ||
  BANK_CODES.has(counterparty.toUpperCase());

const cleanUPIText = (text: string): string =>
  text
    .replaceAll(/[^A-Z0-9\s.-]/giu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();

const extractStructuredUPI = (
  text: string,
  match: RegExpMatchArray
): PartyDetails => {
  const {
    counterparty: rawCounterparty = "",
    bank = "",
    remark: rawRemark = "",
  } = match.groups ?? {};
  let counterparty = rawCounterparty.trim();
  const initialRemark = (rawRemark || bank).trim();
  const afterMatch = text.slice((match.index ?? 0) + match[0].length).trim();
  const remark = resolveUPIRemark(initialRemark, afterMatch);

  if (isInvalidUPICounterparty(counterparty)) {
    counterparty = "";
  }
  return {
    bank,
    counterparty: cleanUPIText(counterparty),
    remark: cleanUPIText(remark),
  };
};

const extractFallbackUPI = (text: string): PartyDetails | null => {
  const parts = text
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const upiIndex = parts.findIndex((part) => {
    const upperPart = part.toUpperCase();
    return upperPart === "UPI" || upperPart === "UP";
  });
  if (upiIndex === -1 || parts.length < upiIndex + 4) {
    return null;
  }

  const upiParts = parts.slice(upiIndex);
  const rawCounterparty = upiParts.at(3) ?? "";
  const bank = upiParts.at(4) ?? "";
  const remainingParts = upiParts.slice(5);
  const counterparty = rawCounterparty.replace(/^\d+/u, "").trim();
  const remaining = [bank, ...remainingParts].filter(Boolean).join(" ").trim();
  const tokens = remaining
    .split(/\s+/u)
    .filter(
      (token) => !BANK_CODES.has(token.toUpperCase()) && !/^\d+X+$/u.test(token)
    );
  return { bank, counterparty, remark: tokens.join(" ").trim() };
};

const extractUPI = (text: string): PartyDetails | null => {
  // UPI and UP both appear as prefixes in supported bank statements.
  const upiRegex =
    /(?:UPI|UP)\/(?:DR|CR)\/[^/]+\/(?<counterparty>[^/]+)(?:\/(?<bank>[^/]+))?(?:\/(?<remark>[^/]+))?/iu;
  const upiMatch = text.match(upiRegex);
  return upiMatch
    ? extractStructuredUPI(text, upiMatch)
    : extractFallbackUPI(text);
};

const extractNEFT = (text: string): PartyDetails | null => {
  if (!text.includes("NEFT")) {
    return null;
  }
  const parts = text
    .split("*")
    .map((part) => part.trim())
    .filter(Boolean);
  // The counterparty can span a newline, for example "KRISCENT \\n TECHNO".
  return { bank: "", counterparty: parts.at(-1) ?? "", remark: "" };
};

const extractIMPS = (text: string): PartyDetails | null => {
  if (!text.includes("IMPS")) {
    return null;
  }
  const parts = text
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  let counterparty = parts.at(2) ?? "";
  let remark = parts.at(3) ?? "";
  if (counterparty.includes("-")) {
    const segments = counterparty.split("-");
    const nameCandidate =
      segments.toReversed().find((segment) => /[A-Z]{3,}/iu.test(segment)) ??
      segments.at(-1);
    if (nameCandidate) {
      remark ||= counterparty;
      counterparty = nameCandidate.replaceAll(/[^A-Z\s]/giu, "").trim();
    }
  }
  return { bank: "", counterparty, remark };
};

interface KeywordSplit {
  after: string;
  before: string;
}

const splitAroundKeyword = (
  text: string,
  keyword: string,
  fromEnd = false
): KeywordSplit | null => {
  const marker = ` ${keyword.toUpperCase()} `;
  const upperText = text.toUpperCase();
  const markerIndex = fromEnd
    ? upperText.lastIndexOf(marker)
    : upperText.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }
  return {
    after: text.slice(markerIndex + marker.length),
    before: text.slice(0, markerIndex),
  };
};

const extractFallbackParty = (
  normalized: string,
  upper: string
): PartyDetails => {
  if (upper.includes(" OF ")) {
    const ofSplit = splitAroundKeyword(normalized, "OF", true);
    const afterOf = ofSplit?.after ?? "";
    if (afterOf.toUpperCase().includes("SBI CARDS")) {
      return {
        bank: "",
        counterparty: "SBI CARDS AND PAYMENT",
        remark: "Credit Card Bill",
      };
    }
    const atSplit = splitAroundKeyword(afterOf, "AT");
    const counterparty = atSplit?.before ?? afterOf;
    return { bank: "", counterparty: counterparty.trim(), remark: "" };
  }

  if (upper.includes("BILL PAYMENT")) {
    const [, after = ""] = normalized.split(/BILL PAYMENT/iu);
    const remark = after.replaceAll(/[-_]/gu, " ").trim().slice(0, 80);
    return {
      bank: "",
      counterparty: "Bill Payment",
      remark: remark || "Bill Payment",
    };
  }

  if (upper.includes("SBI CARDS")) {
    return {
      bank: "",
      counterparty: "SBI CARDS AND PAYMENT",
      remark: "Credit Card Bill",
    };
  }

  if (upper.includes("ATMCARD") || upper.includes("AMC")) {
    const amcMatch = normalized.match(/AMC\s+(?<fee>[\d*]+)/iu);
    const fee = amcMatch?.groups?.fee;
    return {
      bank: "",
      counterparty: "AMC",
      remark: fee ? `AMC Fee ${fee}` : "ATM Card AMC",
    };
  }

  const tokens = normalized
    .split(/\s+/u)
    .filter(
      (token) =>
        token.length > 2 &&
        !BANK_CODES.has(token.toUpperCase()) &&
        !/^[\dX*]+$/u.test(token)
    );
  return {
    bank: "",
    counterparty: tokens.slice(-3).join(" ").slice(0, 60) || "Unknown",
    remark: "",
  };
};

const extractPartyDetails = (
  normalized: string,
  upper: string
): PartyDetails => {
  const upi = extractUPI(normalized);
  if (upi?.counterparty) {
    return upi;
  }
  const neft = extractNEFT(normalized);
  if (neft) {
    return neft;
  }
  const imps = extractIMPS(normalized);
  return imps ?? extractFallbackParty(normalized, upper);
};

const cleanPartyText = (text: string, maxLength: number): string =>
  text
    .replaceAll(/[^A-Z0-9\s.-]/giu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);

interface SanitizedPartyDetails {
  counterparty: string;
  userRemark: string;
}

const sanitizePartyDetails = (details: PartyDetails): SanitizedPartyDetails => {
  let counterparty = cleanPartyText(details.counterparty, 80);
  let userRemark = cleanPartyText(details.remark, 120);

  if (
    !counterparty ||
    BANK_CODES.has(counterparty.toUpperCase()) ||
    /^\d+$/u.test(counterparty)
  ) {
    counterparty = userRemark || "Unknown";
    userRemark = "";
  }

  const counterpartyUpper = counterparty.toUpperCase();
  if (
    counterpartyUpper.includes("KKBK") ||
    counterpartyUpper.includes("YESB")
  ) {
    counterparty = userRemark || counterparty;
  }

  return { counterparty, userRemark };
};

const determineTransactionType = (rawUpper: string): TransactionType => {
  const isInflow =
    rawUpper.includes("DEP TFR") ||
    rawUpper.includes("/CR/") ||
    rawUpper.includes(" CR ") ||
    rawUpper.trim().startsWith("DEP");
  return isInflow ? "INFLOW" : "OUTFLOW";
};

const determinePaymentMethod = (upper: string): PaymentMethod => {
  if (/UPI|\bUP\/(?:DR|CR)\b/u.test(upper)) {
    return "UPI";
  }
  if (upper.includes("NEFT")) {
    return "NEFT";
  }
  if (upper.includes("IMPS")) {
    return "IMPS";
  }
  if (upper.includes("ATMCARD") || upper.includes("ATM")) {
    return "ATM";
  }
  if (upper.includes("CASH") || upper.includes("X/CASH")) {
    return "CASH";
  }
  return "OTHER";
};

const determineExpenseCategory = (
  primaryText: string,
  transactionType: TransactionType,
  counterparty: string,
  userRemark: string,
  rawInput: string
): string => {
  let expenseCategory = getCategoryFromText(
    primaryText,
    transactionType,
    counterparty,
    rawInput
  );
  if (expenseCategory === OTHER_CATEGORY && userRemark && counterparty) {
    const alternative = getCategoryFromText(
      counterparty,
      transactionType,
      counterparty,
      rawInput
    );
    if (alternative !== OTHER_CATEGORY) {
      expenseCategory = alternative;
    }
  }

  if (expenseCategory === OTHER_CATEGORY || expenseCategory === "Shopping") {
    const suffix = extractSuffixHandleArea(rawInput);
    const healthCategory = checkHealthMedical(counterparty, suffix);
    if (healthCategory) {
      expenseCategory = healthCategory;
    }
  }
  return expenseCategory;
};

const hasShoppingHint = (userRemark: string, counterparty: string): boolean => {
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
  const lowerRemark = userRemark.toLowerCase();
  const lowerCounterparty = counterparty.toLowerCase();
  return shoppingHints.some(
    (hint) => lowerRemark.includes(hint) || lowerCounterparty.includes(hint)
  );
};

const isLikelyCashLendingRemark = (userRemark: string): boolean => {
  const lowerRemark = userRemark.toLowerCase();
  const cashHints = ["cash", "lent", "borrow", "x cash"];
  return (
    lowerRemark === "" || cashHints.some((hint) => lowerRemark.includes(hint))
  );
};

const detectSalary = (upper: string): boolean =>
  SALARY_KEYWORDS.some((keyword) => upper.includes(keyword));

const detectBill = (
  upper: string,
  counterparty: string,
  userRemark: string
): boolean => {
  const counterpartyUpper = counterparty.toUpperCase();
  const remarkUpper = userRemark.toUpperCase();
  return BILL_KEYWORDS.some(
    (keyword) =>
      upper.includes(keyword) ||
      counterpartyUpper.includes(keyword) ||
      remarkUpper.includes(keyword)
  );
};

const detectLending = (
  counterparty: string,
  userRemark: string,
  paymentMethod: PaymentMethod,
  transactionType: TransactionType,
  isBill: boolean
): boolean => {
  const counterpartyUpper = counterparty.toUpperCase();
  const isPerson =
    LENDING_PERSON_PATTERN.test(counterpartyUpper) &&
    !BILL_KEYWORDS.some((keyword) => counterpartyUpper.includes(keyword));
  const conditions = [
    isPerson,
    paymentMethod === "UPI" || paymentMethod === "IMPS",
    transactionType === "OUTFLOW",
    !isBill,
    isLikelyCashLendingRemark(userRemark),
    !hasShoppingHint(userRemark, counterparty),
  ];
  return conditions.every(Boolean);
};

export const parseTransactionText = (rawInput: string): ParsedTransaction => {
  const withoutAccount = cleanAccountHolder(rawInput);
  const stripped = stripPrefixes(withoutAccount);
  const normalized = stripped.replaceAll(/\s+/gu, " ").trim();
  const upper = normalized.toUpperCase();
  const transactionType = determineTransactionType(rawInput.toUpperCase());
  const paymentMethod = determinePaymentMethod(upper);
  const partyDetails = extractPartyDetails(normalized, upper);
  const { counterparty, userRemark } = sanitizePartyDetails(partyDetails);
  const primaryText = userRemark || counterparty;
  let expenseCategory = determineExpenseCategory(
    primaryText,
    transactionType,
    counterparty,
    userRemark,
    rawInput
  );
  const isSalary = detectSalary(upper);
  if (isSalary && transactionType === "INFLOW") {
    expenseCategory = SALARY_CATEGORY;
  }
  const isBill = detectBill(upper, counterparty, userRemark);
  const isRecurringCandidate =
    isBill || ["Utilities", "Subscriptions", "Rent"].includes(expenseCategory);
  const isLending = detectLending(
    counterparty,
    userRemark,
    paymentMethod,
    transactionType,
    isBill
  );
  const cleanNote = userRemark
    ? `${counterparty} - ${userRemark}`
    : counterparty;

  return {
    clean_note: cleanNote,
    counterparty: counterparty || "Unknown",
    expense_category: expenseCategory,
    is_bill: isBill,
    is_lending: isLending,
    is_recurring_candidate: isRecurringCandidate,
    is_salary: isSalary,
    payment_method: paymentMethod,
    transaction_type: transactionType,
    user_remark: userRemark,
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
  for (const example of examples) {
    console.log(`Input: ${example.replaceAll(/\s+/gu, " ").slice(0, 80)}...`);
    console.log(JSON.stringify(parseTransactionText(example), null, 2));
    console.log("---");
  }
}
