import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ElementType, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Splits text into words that slide up from a mask, one after another. */
export function RevealText({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  stagger = 0.06,
  immediate = false,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
}) {
  const words = text.split(" ").filter(Boolean);
  const trigger = immediate
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, margin: "-10% 0px" } };
  return (
    <Tag className={className} aria-label={text}>
      <motion.span
        aria-hidden
        initial="hidden"
        {...trigger}
        transition={{ staggerChildren: stagger, delayChildren: delay }}
        className="inline"
      >
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className="inline-block will-change-transform"
              variants={{ hidden: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0 } }}
              transition={{ duration: 1, ease: EASE }}
            >
              {w}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

export function FadeUp({
  children,
  delay = 0,
  className = "",
  y = 36,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Image that unveils with a clip-path wipe and drifts with a gentle parallax. */
export function RevealImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  parallax = 60,
  direction = "up",
  priority = false,
  sizesSmall = true,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  parallax?: number;
  direction?: "up" | "left" | "right" | "center";
  priority?: boolean;
  sizesSmall?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-parallax, parallax]);

  const from = {
    up: "inset(100% 0% 0% 0%)",
    left: "inset(0% 100% 0% 0%)",
    right: "inset(0% 0% 0% 100%)",
    center: "inset(0% 50% 0% 50%)",
  }[direction];

  const small = src.replace(".webp", "-sm.webp");

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden bg-sand ${className}`}
      initial={{ clipPath: from }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.img
        src={src}
        srcSet={sizesSmall ? `${small} 720w, ${src} 1600w` : undefined}
        sizes={sizesSmall ? "(max-width: 768px) 100vw, 50vw" : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={{ y }}
        initial={{ scale: 1.25 }}
        whileInView={{ scale: 1.12 }}
        viewport={{ once: true }}
        transition={{ duration: 1.8, ease: EASE }}
        className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
      />
    </motion.div>
  );
}
