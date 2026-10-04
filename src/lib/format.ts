export const round2 = (n: number): number =>
  Math.round((Number(n) || 0) * 100) / 100;

export const parseAmount = (raw: string): number => {
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

export const money = (n: number, currency = "$"): string => {
  const v = round2(n);
  const abs = Math.abs(v);
  const maxFrac = abs >= 1000 ? 0 : 2;
  const minFrac = abs >= 1000 || Number.isInteger(abs) ? 0 : 2;
  const str = abs.toLocaleString("en-US", {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: minFrac,
  });
  return `${v < 0 ? "−" : ""}${currency}${str}`;
};

export const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const compareDateStrings = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

export const parseDay = (s: string): Date => {
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) {
    return new Date();
  }
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number): string => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};

export const addMonths = (s: string, n: number): string => {
  const d = parseDay(s);
  d.setMonth(d.getMonth() + n);
  return isoDay(d);
};

export const diffDays = (a: string, b: string): number =>
  Math.round((parseDay(a).getTime() - parseDay(b).getTime()) / 86_400_000);

export const monthKey = (s: string): string => (s || "").slice(0, 7);

export const monthLabel = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) {
    return key;
  }
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export const prettyDate = (s: string): string => {
  const d = parseDay(s);
  const today = new Date();
  const t = isoDay(today);
  if (s === t) {
    return "Today";
  }
  if (s === addDays(t, -1)) {
    return "Yesterday";
  }
  if (s === addDays(t, 1)) {
    return "Tomorrow";
  }
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
};

export const median = (nums: number[]): number => {
  const a = nums.filter((x) => Number.isFinite(x)).toSorted((x, y) => x - y);
  if (!a.length) {
    return 0;
  }
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

export const greeting = (now = new Date()): string => {
  const h = now.getHours();
  if (h < 5) {
    return "Quiet night";
  }
  if (h < 12) {
    return "Good morning";
  }
  if (h < 17) {
    return "Good afternoon";
  }
  if (h < 22) {
    return "Good evening";
  }
  return "Winding down";
};
