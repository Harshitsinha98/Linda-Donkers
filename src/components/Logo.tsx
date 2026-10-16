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
    <span className={`flex items-center gap-2 sm:gap-3 ${light ? "text-linen" : "text-ink"}`}>
      <LogoMark className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
      <span className="flex flex-col leading-none">
        <span className="whitespace-nowrap font-display text-[1.1rem] tracking-tight sm:text-[1.25rem]">Linda Donkers</span>
        <span className="mt-1 whitespace-nowrap text-[0.52rem] font-semibold uppercase tracking-[0.3em] opacity-60 sm:text-[0.58rem] sm:tracking-[0.34em]">Diamond Yoga</span>
      </span>
    </span>
  );
}

/** Animated "Powered by Infiskies" credit shown just beneath the logo. */
export function PoweredByInfiskies({ light = false }: { light?: boolean }) {
  return (
    <a
      href="https://infiskies.com"
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="hover"
      onClick={(e) => e.stopPropagation()}
      className="group mt-1.5 inline-flex w-fit items-center gap-1 whitespace-nowrap text-[0.5rem] font-semibold uppercase tracking-[0.28em] transition-transform duration-300 hover:-translate-y-px sm:text-[0.54rem] sm:tracking-[0.3em]"
      aria-label="Powered by Infiskies"
    >
      <span className={`transition-opacity duration-300 ${light ? "text-linen/55 group-hover:text-linen/80" : "text-ink/45 group-hover:text-ink/70"}`}>
        Powered by
      </span>
      <span className={`infiskies-credit font-bold ${light ? "infiskies-credit--light" : ""}`}>
        Infiskies
      </span>
      <span className={`infiskies-spark ${light ? "infiskies-spark--light" : ""}`} aria-hidden="true" />
    </a>
  );
}
