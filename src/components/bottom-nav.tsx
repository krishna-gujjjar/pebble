import { TABS } from "../lib/tabs";
import type { Tab } from "../lib/tabs";

const BottomNav = ({
  tab,
  onGo,
}: {
  tab: Tab;
  onGo: (dest: string) => void;
}) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1c2b23]/8 bg-[#faf7ef]/95 backdrop-blur-md md:hidden">
    <div className="mx-auto grid max-w-180 grid-cols-5 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            type="button"
            key={t.id}
            onClick={() => onGo(t.id)}
            className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-semibold ${active ? "text-[#1c2b23]" : "text-[#8a978d]"}`}
          >
            <span
              className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? "bg-[#1c2b23] text-[#f7f4ec]" : ""}`}
            >
              <t.icon size={17} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
