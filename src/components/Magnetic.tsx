import { Arrow } from "./Arrow";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";

/** Wrapper that gently pulls its content toward the pointer (desktop only). */
export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 14, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 14, mass: 0.4 });

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span ref={ref} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset} className="inline-block">
      {children}
    </motion.span>
  );
}

type BtnProps = {
  children: ReactNode;
  to?: string;
  href?: string;
  variant?: "primary" | "ghost" | "light";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
};

/** Pill button with a liquid fill on hover and magnetic pull. */
export function Button({ children, to, href, variant = "primary", className = "", onClick, type = "button" }: BtnProps) {
  const base =
    "group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-7 py-4 text-[0.82rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-500";
  const styles = {
    primary: "bg-saffron text-linen",
    ghost: "border border-forest/25 text-forest hover:text-linen",
    light: "border border-linen/40 text-linen hover:text-ink",
  }[variant];
  const fill = { primary: "bg-forest", ghost: "bg-forest", light: "bg-linen" }[variant];

  const inner = (
    <>
      <span
        className={`absolute inset-0 translate-y-[115%] rounded-[50%] ${fill} transition-[transform,border-radius] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:rounded-none`}
      />
      <span className="relative z-10">{children}</span>
      <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1" aria-hidden>
        <Arrow className="h-4 w-4" />
      </span>
    </>
  );

  const cls = `${base} ${styles} ${className}`;
  return (
    <Magnetic>
      {to ? (
        <Link to={to} className={cls} data-cursor="hover">
          {inner}
        </Link>
      ) : href ? (
        <a href={href} className={cls} target="_blank" rel="noreferrer" data-cursor="hover">
          {inner}
        </a>
      ) : (
        <button type={type} onClick={onClick} className={cls} data-cursor="hover">
          {inner}
        </button>
      )}
    </Magnetic>
  );
}
