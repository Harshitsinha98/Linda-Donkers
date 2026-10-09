import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";

const HALF = 4000; // 4 seconds in, 4 seconds out

/** A living circle that inhales and exhales, with the instruction changing in sync. */
export function BreathingCircle() {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const [inhale, setInhale] = useState(true);

  useEffect(() => {
    if (!inView) return;
    setInhale(true);
    const id = window.setInterval(() => setInhale((v) => !v), HALF);
    return () => window.clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="relative mx-auto flex aspect-square w-[min(78vw,440px)] items-center justify-center">
      {[1, 0.82, 0.64].map((s, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-sage/40"
          style={{ scale: s }}
          animate={reduce || !inView ? undefined : { scale: [s * 0.78, s, s * 0.78] }}
          transition={{ duration: (HALF * 2) / 1000, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
        />
      ))}
      <motion.span
        className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#f5b27c_0%,#e8762b_45%,#c25a1a_100%)] shadow-[0_30px_80px_-20px_rgba(232,118,43,0.6)]"
        animate={reduce || !inView ? undefined : { scale: [0.7, 1, 0.7] }}
        transition={{ duration: (HALF * 2) / 1000, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 h-10 overflow-hidden text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={inhale ? "in" : "out"}
            initial={{ y: 30, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -30, opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-3xl italic text-linen"
          >
            {inhale ? t.home.breatheIn : t.home.breatheOut}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
