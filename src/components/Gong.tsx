import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Wave = { id: number; x: number; y: number };

/** An abstract gong. It ripples on its own, and every touch or hover sends out new sound waves. */
export function Gong({ hint }: { hint: string }) {
  const reduce = useReducedMotion();
  const [waves, setWaves] = useState<Wave[]>([]);
  const idRef = useRef(0);
  const last = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const strike = useCallback((x = 50, y = 50) => {
    const id = ++idRef.current;
    setWaves((w) => [...w.slice(-7), { id, x, y }]);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const iv = window.setInterval(() => strike(), 2600);
    strike();
    return () => window.clearInterval(iv);
  }, [reduce, strike]);

  const onMove = (e: React.PointerEvent) => {
    const now = performance.now();
    if (now - last.current < 450 || !ref.current) return;
    last.current = now;
    const r = ref.current.getBoundingClientRect();
    strike(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerDown={onMove}
      data-cursor="hover"
      className="relative mx-auto aspect-square w-[min(84vw,520px)] touch-pan-y"
    >
      {waves.map((w) => (
        <motion.span
          key={w.id}
          className="pointer-events-none absolute aspect-square w-full rounded-full border border-saffron/60"
          style={{ left: `${w.x}%`, top: `${w.y}%`, translateX: "-50%", translateY: "-50%" }}
          initial={{ scale: 0.25, opacity: 0.9 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 3.4, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() => setWaves((all) => all.filter((x) => x.id !== w.id))}
        />
      ))}

      <motion.div
        className="absolute inset-[12%] rounded-full shadow-[0_40px_90px_-30px_rgba(29,36,30,0.55)]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #3a2a1c 0 7%, #8a5a2b 8% 9%, #c9883f 10% 30%, #e3ab5f 31% 32%, #b8742f 33% 62%, #e8b46a 63% 64%, #8a5a2b 65% 96%, #4a3220 97% 100%)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,transparent_0deg,rgba(255,240,210,0.35)_40deg,transparent_90deg,transparent_220deg,rgba(255,240,210,0.2)_260deg,transparent_300deg)]" />
      </motion.div>

      <p className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-forest/50">
        {hint}
      </p>
    </div>
  );
}
