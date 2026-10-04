import {
  HandCoins,
  Home,
  LayoutList,
  PieChart,
  ReceiptText,
} from "lucide-react";

export type Tab =
  | "home"
  | "transactions"
  | "lending"
  | "recurring"
  | "reports"
  | "insights"
  | "care";

export interface TabItem {
  id: Tab;
  label: string;
  icon: typeof Home;
}

export const TABS: TabItem[] = [
  { icon: Home, id: "home", label: "Home" },
  { icon: LayoutList, id: "transactions", label: "Entries" },
  { icon: HandCoins, id: "lending", label: "Lending" },
  { icon: ReceiptText, id: "recurring", label: "Bills" },
  { icon: PieChart, id: "reports", label: "Reports" },
];
