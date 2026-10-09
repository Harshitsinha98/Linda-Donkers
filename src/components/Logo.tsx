import { motion } from "framer-motion";

const PATHS = [
  "M30 16 H70 L84 31 L50 64 L16 31 Z",
  "M16 31 H84",
  "M30 16 L37 31 L43.5 16 L50 31 L56.5 16 L63 31 L70 16",
  "M37 31 L50 64 L63 31",
  "M50 80 C44 72 29 72 29 80 C29 88 44 88 50 80 C56 72 71 72 71 80 C71 88 56 88 50 80 Z",
];

type Props = { className?: string; draw?: boolean; strokeWidth?: number };

/** Linda's mark: a diamond with the infinity sign beneath it. */
export function LogoMark({ className = "h-9 w-9", draw = false, strokeWidth = 3.4 }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        {PATHS.map((d, i) =>
          draw ? (
            <motion.path
              key={i}
              d={d}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: i === 4 ? 1.4 : 1.1, delay: i === 4 ? 0.9 : i * 0.14, ease: [0.65, 0, 0.35, 1] }}
            />
          ) : (
            <path key={i} d={d} />
          ),
        )}
      </g>
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-3 ${light ? "text-linen" : "text-ink"}`}>
      <LogoMark className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.25rem] tracking-tight">Linda Donkers</span>
        <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.34em] opacity-60">Diamond Yoga</span>
      </span>
    </span>
  );
}
