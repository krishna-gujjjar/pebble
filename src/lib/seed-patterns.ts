/** everyday spending patterns used to build the first-run sample life */
export const EXP_PATTERNS: {
  c: string;
  hi: number;
  lo: number;
  notes: string[];
}[] = [
  {
    c: "Groceries",
    hi: 96,
    lo: 28,
    notes: ["Weekly groceries", "Fresh market run", "Supermarket top-up"],
  },
  {
    c: "Dining",
    hi: 46,
    lo: 9,
    notes: ["Lunch with Sam", "Neighbourhood café", "Friday pizza night"],
  },
  {
    c: "Transport",
    hi: 52,
    lo: 6,
    notes: ["Metro top-up", "Ride home", "Fuel refill"],
  },
  {
    c: "Utilities",
    hi: 88,
    lo: 24,
    notes: ["Electricity bill", "Internet bill", "Water bill"],
  },
  {
    c: "Subscriptions",
    hi: 16,
    lo: 5,
    notes: ["Music plan", "Cloud storage", "Streaming plan"],
  },
  {
    c: "Shopping",
    hi: 120,
    lo: 18,
    notes: ["New running shoes", "Home basics", "Bookstore haul"],
  },
  {
    c: "Health",
    hi: 90,
    lo: 12,
    notes: ["Pharmacy", "Dental check-up", "Gym month"],
  },
  {
    c: "Fun",
    hi: 60,
    lo: 10,
    notes: ["Cinema evening", "Board-game night", "Concert ticket"],
  },
];
