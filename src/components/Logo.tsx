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
      <span aria-hidden className="ifx-word relative inline-flex font-bold">
        {text.split("").map((c, i) => (
          <span key={i} className="ifx-letter" style={{ animationDelay: `${i * 0.11}s` }}>
            {c}
          </span>
        ))}
        <span className="ifx-underline" />
      </span>
      <svg aria-hidden viewBox="0 0 24 24" className="ifx-star h-[0.8em] w-[0.8em] sm:h-[0.85em] sm:w-[0.85em]">
        <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="currentColor" />
      </svg>
    </a>
  );
}
