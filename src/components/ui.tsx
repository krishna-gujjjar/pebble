import { div as MotionDiv, circle as MotionCircle } from "motion/react-m";
import type { ReactNode } from "react";

export const Card = ({
  children,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) => (
  <div
    className={`rounded-3xl shadow-[0_2px_20px_-8px_rgba(28,43,35,0.18)] ring-1 ${dark ? "bg-[#1c2b23] ring-[#1c2b23]" : "bg-white ring-[#1c2b23]/10"} ${className}`}
  >
    {children}
  </div>
);

export const SectionTitle = ({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-3 px-1">
    <div>
      <h2 className="font-display text-[17px] font-semibold text-[#1c2b23]">
        {title}
      </h2>
      {sub ? <p className="mt-0.5 text-[13px] text-[#5b6b60]">{sub}</p> : null}
    </div>
    {action}
  </div>
);

export const Empty = ({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center px-6 py-10 text-center">
    <img
      src="/images/companion.png"
      alt="Pebble companion"
      className="h-20 w-20 rounded-full object-cover ring-1 ring-[#1c2b23]/10"
    />
    <p className="font-display mt-4 text-[16px] font-semibold text-[#1c2b23]">
      {title}
    </p>
    <p className="mt-1 max-w-[260px] text-[13.5px] leading-relaxed text-[#5b6b60]">
      {body}
    </p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const Ring = ({
  value,
  size = 92,
  label,
  sub,
}: {
  value: number;
  size?: number;
  label: string;
  sub: string;
}) => {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ height: size, width: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e9e2d2"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <MotionCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1e4d3a"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
      </div>
      <div>
        <p className="font-display text-[22px] font-bold text-[#1c2b23]">
          {label}
        </p>
        <p className="text-[13px] text-[#5b6b60]">{sub}</p>
      </div>
    </div>
  );
};

export const Bar = ({
  pct,
  color = "#1e4d3a",
}: {
  pct: number;
  color?: string;
}) => {
  const fill = Math.max(0, Math.min(1, pct / 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#efe9d8]">
      <MotionDiv
        className="h-full origin-left rounded-full"
        style={{ background: color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: fill }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
};

export const Pill = ({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${active ? "bg-[#1c2b23] text-[#f7f4ec]" : "bg-white text-[#3d4b42] ring-1 ring-[#1c2b23]/10 hover:ring-[#1c2b23]/30"}`}
  >
    {children}
  </button>
);
