import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { RevealText } from "./Reveal";

/** Shared hero for inner pages: big serif title + an image that opens like a curtain. */
export function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  image,
  alt,
  position = "center",
}: {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  image: string;
  alt: string;
  position?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-32 sm:pt-40">
      <div className="container-x grid items-end gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            {eyebrow}
          </motion.span>
          <h1 className="display-xl mt-6 text-ink">
            <RevealText text={title} immediate delay={0.25} />
            <RevealText text={accent} immediate delay={0.45} className="italic-accent" />
          </h1>
        </div>
        <motion.p
          className="lead max-w-md lg:col-span-5 lg:pb-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {intro}
        </motion.p>
      </div>

      <div className="container-x mt-14">
        <motion.div
          className="relative h-[58vh] min-h-[340px] overflow-hidden rounded-[2rem] sm:h-[72vh]"
          initial={{ clipPath: "inset(0% 50% 0% 50% round 2rem)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0% round 2rem)" }}
          transition={{ duration: 1.6, delay: 0.5, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.img
            src={image}
            alt={alt}
            style={{ y, scale, objectPosition: position }}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
