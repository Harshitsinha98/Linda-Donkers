/** A parallax collage: each frame drifts at its own speed while you scroll (desktop only). */
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { IMG, sm, type ImgKey } from "../../data/site";
import { useLang } from "../../i18n/LanguageContext";

const FRAMES: { key: ImgKey; speed: number; className: string; focus?: string }[] = [
  { key: "twist", speed: -60, className: "lg:col-span-4 lg:row-span-2 aspect-[3/4]", focus: "50% 25%" },
  { key: "lomi1", speed: 40, className: "lg:col-span-3 aspect-[3/4] lg:mt-24" },
  { key: "happy", speed: -20, className: "lg:col-span-5 aspect-[4/3]", focus: "50% 20%" },
  { key: "goldenTemple", speed: 70, className: "lg:col-span-3 lg:col-start-6 aspect-square", focus: "50% 45%" },
  { key: "heart", speed: -40, className: "lg:col-span-4 aspect-[4/5]", focus: "50% 25%" },
];

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

function Frame({ f, i, caption }: { f: (typeof FRAMES)[number]; i: number; caption: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const wide = useWide();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [f.speed, -f.speed]);
  const src = IMG[f.key];

  return (
    <motion.figure
      ref={ref}
      style={reduce || !wide ? undefined : { y }}
      className={`group ${f.className}`}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-[1.25rem] bg-sand"
        initial={{ opacity: 0, clipPath: "inset(12% 12% 12% 12% round 1.25rem)" }}
        whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 1.25rem)" }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.2, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={sm(src)}
          srcSet={`${sm(src)} 720w, ${src} 1600w`}
          sizes="(min-width:1024px) 33vw, 100vw"
          alt={caption}
          loading="lazy"
          style={{ objectPosition: f.focus }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
      </motion.div>
      <figcaption className="mt-3 flex justify-between text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-forest/55">
        <span>{caption}</span>
        <span>{String(i + 1).padStart(2, "0")}</span>
      </figcaption>
    </motion.figure>
  );
}

export function ParallaxFrames() {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
      {FRAMES.map((f, i) => (
        <Frame key={f.key} f={f} i={i} caption={t.gallery.captions[f.key as keyof typeof t.gallery.captions]} />
      ))}
    </div>
  );
}
