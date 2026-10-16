import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

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

const BRAND = "INFISKIES";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=<>/";

/** Hover "decode" effect: letters scramble, then lock in left to right. */
function useScramble(target: string) {
  const [text, setText] = useState(target);
  const timer = useRef<number | null>(null);

  const run = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    let frame = 0;
    timer.current = window.setInterval(() => {
      frame++;
      const locked = Math.floor(frame / 2);
      setText(
        target
          .split("")
          .map((c, i) => (i < locked ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (locked >= target.length && timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 40);
  }, [target]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  return [text, run] as const;
}

/** Animated "Powered by Infiskies" credit shown just beneath the logo. */
export function PoweredByInfiskies({ light = false }: { light?: boolean }) {
  const [text, scramble] = useScramble(BRAND);
  return (
    <a
      href="https://infiskies.com"
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="hover"
      onMouseEnter={scramble}
      onFocus={scramble}
      className={`ifx group mt-1.5 inline-flex w-fit items-center gap-1 whitespace-nowrap text-[0.5rem] font-semibold uppercase tracking-[0.28em] sm:text-[0.54rem] sm:tracking-[0.3em] ${light ? "ifx--light" : ""}`}
      aria-label="Powered by Infiskies"
    >
      <span aria-hidden className={`transition-colors duration-300 ${light ? "text-linen/55 group-hover:text-linen/85" : "text-ink/45 group-hover:text-ink/75"}`}>
        Powered by
      </span>
      <InfiskiesMark light={light} />
      <span aria-hidden className="ifx-word relative inline-flex font-bold">
        {text.split("").map((c, i) => (
          <span key={i} className="ifx-letter" style={{ animationDelay: `${i * 0.11}s` }}>
            {c}
          </span>
        ))}
        <span className="ifx-underline" />
      </span>
    </a>
  );
}

/** Infiskies infinity path (figure-eight crossing at the centre). */
const INFINITY =
  "M50 25 C42 14 32 8 22 8 C12 8 6 16 6 25 C6 34 12 42 22 42 C32 42 42 36 50 25 C58 14 68 8 78 8 C88 8 94 16 94 25 C94 34 88 42 78 42 C68 42 58 36 50 25 Z";

/** Animated Infiskies mark: stroke draws in, blue fill breathes, a comet of light loops the path. */
function InfiskiesMark({ light = false }: { light?: boolean }) {
  return (
    <svg viewBox="0 0 100 50" aria-hidden className="ifx-mark h-[1.45em] w-[2.9em] shrink-0 overflow-visible">
      <defs>
        <linearGradient id={light ? "ifx-fill-l" : "ifx-fill"} x1="0" x2="1">
          <stop offset="0%" stopColor="#7cc8f2" />
          <stop offset="50%" stopColor="#4fb0e8" />
          <stop offset="100%" stopColor="#7cc8f2" />
        </linearGradient>
      </defs>
      <path className="ifx-mark-fill" d={INFINITY} fill={`url(#${light ? "ifx-fill-l" : "ifx-fill"})`} />
      <motion.path
        d={INFINITY}
        fill="none"
        stroke={light ? "var(--color-linen)" : "#0b0b0b"}
        strokeWidth={7}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
      />
      <path className="ifx-mark-comet" d={INFINITY} pathLength={100} fill="none" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}
