import { isoDay } from "./format";
import { EXP_PATTERNS } from "./seed-patterns";
import type { Loan, Recurring, Txn } from "./types";

export const rnd = (seed: { v: number }) => {
  seed.v = (seed.v * 9301 + 49_297) % 233_280;
  return seed.v / 233_280;
};

export const buildStarterData = (now = new Date()) => {
  const seed = { v: 42 };
  const today = isoDay(now);
  const txns: Txn[] = [];
  const mk = (uid: string, t: Partial<Txn>) =>
    // SAFETY: defaults fill every required Txn field; spread overrides only some.
    txns.push({
      amount: 20,
      category: "Other",
      createdAt: new Date().toISOString(),
      date: today,
      kind: "expense",
      note: "",
      payment: "Card",
      uid,
      ...t,
    } as Txn);

  for (let i = 3; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mk(`seed-sal-${i}`, {
      amount: 3450,
      category: "Salary",
      date: isoDay(d),
      kind: "income",
      note: "Monthly salary",
      payment: "Bank",
    });
  }
  const fl = new Date(now);
  fl.setDate(fl.getDate() - 12);
  mk("seed-freelance-1", {
    amount: 480,
    category: "Freelance",
    date: isoDay(fl),
    kind: "income",
    note: "Logo project - final invoice",
    payment: "Bank",
  });

  for (let i = 2; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 2);
    mk(`seed-rent-${i}`, {
      amount: 1150,
      category: "Rent",
      date: isoDay(d),
      kind: "expense",
      note: "Monthly rent",
      payment: "Bank",
    });
  }

  let n = 0;
  for (let back = 75; back >= 0; back -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - back);
    let count = 0;
    if (rnd(seed) < 0.72) {
      count = rnd(seed) < 0.3 ? 2 : 1;
    }
    for (let k = 0; k < count; k += 1) {
      const e = EXP_PATTERNS[Math.floor(rnd(seed) * EXP_PATTERNS.length)];
      const amt = Math.round((e.lo + rnd(seed) * (e.hi - e.lo)) * 100) / 100;
      const note = e.notes[Math.floor(rnd(seed) * e.notes.length)];
      mk(`seed-t-${n}`, {
        amount: amt,
        category: e.c,
        date: isoDay(d),
        kind: "expense",
        note,
        payment: rnd(seed) < 0.6 ? "Card" : "Cash",
      });
      n += 1;
    }
  }
  const un = new Date(now);
  un.setDate(un.getDate() - 4);
  mk("seed-unusual-1", {
    amount: 320,
    category: "Shopping",
    date: isoDay(un),
    kind: "expense",
    note: "Noise-cancelling headphones",
    payment: "Card",
  });

  const loans: Loan[] = [
    {
      amount: 150,
      createdAt: new Date().toISOString(),
      date: today,
      direction: "lent",
      dueDate: today,
      note: "Concert tickets",
      person: "Alex",
      repaid: 50,
      status: "open",
      uid: "seed-loan-1",
    },
    {
      amount: 60,
      createdAt: new Date().toISOString(),
      date: today,
      direction: "borrowed",
      dueDate: today,
      note: "Airport taxi split",
      person: "Maya",
      repaid: 0,
      status: "open",
      uid: "seed-loan-2",
    },
  ];

  const in10 = new Date(now);
  in10.setDate(in10.getDate() + 6);
  const in3 = new Date(now);
  in3.setDate(in3.getDate() + 3);
  const recurrings: Recurring[] = [
    {
      active: true,
      amount: 59,
      category: "Utilities",
      createdAt: new Date().toISOString(),
      frequency: "monthly",
      lastPaid: today,
      nextDue: isoDay(in3),
      title: "Internet bill",
      uid: "seed-r-1",
    },
    {
      active: true,
      amount: 11,
      category: "Subscriptions",
      createdAt: new Date().toISOString(),
      frequency: "monthly",
      lastPaid: today,
      nextDue: isoDay(in10),
      title: "Music plan",
      uid: "seed-r-2",
    },
    {
      active: true,
      amount: 35,
      category: "Health",
      createdAt: new Date().toISOString(),
      frequency: "monthly",
      lastPaid: today,
      nextDue: today,
      title: "Gym",
      uid: "seed-r-3",
    },
  ];

  return { loans, recurrings, txns };
};
