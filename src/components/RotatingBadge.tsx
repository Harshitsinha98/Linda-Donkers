import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "./Logo";

/** Circular text that slowly turns around the logo mark. */
export function RotatingBadge({ text, className = "" }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-cream/90 backdrop-blur ${className}`}>
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        aria-hidden
      >
        <defs>
          <path id="badge-circle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        </defs>
        <text className="fill-forest" style={{ fontSize: 15.5, letterSpacing: 4.2, fontWeight: 600 }}>
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </motion.svg>
      <LogoMark className="h-[34%] w-[34%] text-saffron" strokeWidth={4} />
    </div>
  );
}
