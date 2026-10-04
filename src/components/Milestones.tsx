import { Award, Lock, Trophy } from "lucide-react";

import type { Milestone } from "../lib/types";
import { Bar, Card } from "./ui";

const Milestones = ({ items }: { items: Milestone[] }) => {
  const unlocked = items.filter((m) => m.unlocked).length;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ec]">
            <Trophy size={18} className="text-[#1e4d3a]" />
          </span>
          <div>
            <p className="font-display text-[16px] font-semibold text-[#1c2b23]">
              Quiet milestones
            </p>
            <p className="text-[12.5px] text-[#5b6b60]">
              {unlocked} of {items.length} reached - no pressure, just progress.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {items.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl p-3.5 ring-1 ${m.unlocked ? "bg-[#eef5ec] ring-[#1e4d3a]/20" : "bg-[#f8f5ec] ring-[#1c2b23]/8"}`}
          >
            <div className="flex items-center gap-2">
              {m.unlocked ? (
                <Award size={15} className="shrink-0 text-[#1e4d3a]" />
              ) : (
                <Lock size={13} className="shrink-0 text-[#8a978d]" />
              )}
              <p className="text-[13.5px] font-semibold text-[#1c2b23]">
                {m.title}
              </p>
            </div>
            <p className="mt-0.5 text-[12px] text-[#5b6b60]">{m.body}</p>
            <div className="mt-2">
              <Bar
                pct={m.progress * 100}
                color={m.unlocked ? "#1e4d3a" : "#b9c2b6"}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Milestones;
