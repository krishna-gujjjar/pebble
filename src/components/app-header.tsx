import { Sparkles, Sprout } from "lucide-react";

import { TABS } from "../lib/tabs";
import type { TabItem } from "../lib/tabs";

const AppHeader = ({
  tab,
  notes,
  onGo,
}: {
  tab: TabItem["id"];
  notes: number;
  onGo: (dest: string) => void;
}) => (
  <header className="sticky top-0 z-40 border-b border-[#1c2b23]/8 bg-[#f4f0e4]/90 backdrop-blur-md">
    <div className="mx-auto flex max-w-180 items-center justify-between px-4 py-3">
      <button
        type="button"
        onClick={() => onGo("home")}
        className="flex items-center gap-2.5"
      >
        <img
          src="/images/companion.png"
          alt="Pebble"
          className="h-9 w-9 rounded-full object-cover ring-1 ring-[#1c2b23]/15"
        />
        <span className="font-display text-[19px] font-bold tracking-tight">
          Pebble
        </span>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onGo("insights")}
          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-[#1c2b23]/10"
        >
          <Sparkles size={13} className="text-[#b97f1f]" /> {notes} notes
        </button>
        <button
          type="button"
          onClick={() => onGo("care")}
          className="rounded-full bg-[#1c2b23] p-2 text-[#f7f4ec]"
          aria-label="Settings"
        >
          <Sprout size={16} />
        </button>
      </div>
    </div>
    <nav className="mx-auto hidden max-w-180 items-center gap-1 px-4 pb-2.5 md:flex">
      {[
        ...TABS,
        { icon: Sparkles, id: "insights", label: "Insights" },
        { icon: Sprout, id: "care", label: "Care" },
      ].map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => onGo(t.id)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${tab === t.id ? "bg-[#1c2b23] text-[#f7f4ec]" : "text-[#5b6b60] hover:bg-white"}`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  </header>
);

export default AppHeader;
