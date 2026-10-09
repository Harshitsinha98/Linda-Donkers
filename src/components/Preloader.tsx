import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";
import { useLang } from "../i18n/LanguageContext";
import { setScrollLocked } from "./SmoothScroll";

/** Diamond + infinity line drawing, then a curtain lifts to reveal the site. Shown once per session. */
export function Preloader({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [visible, setVisible] = useState(() => !sessionStorage.getItem("ld-intro"));

  useEffect(() => {
    if (!visible) {
      onDone();
      return;
    }
    setScrollLocked(true);
    const id = window.setTimeout(() => {
      sessionStorage.setItem("ld-intro", "1");
      setVisible(false);
    }, 2600);
    return () => window.clearTimeout(id);
  }, [visible, onDone]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        setScrollLocked(false);
      }}
    >
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink text-linen"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.9, 1.04, 1] }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          >
            <LogoMark draw className="h-28 w-28 sm:h-36 sm:w-36" strokeWidth={2.2} />
          </motion.div>
          <motion.p
            className="mt-8 font-display text-lg italic tracking-wide text-linen/70"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.2em" }}
            transition={{ delay: 0.8, duration: 1.4 }}
          >
            {t.preloader}…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
