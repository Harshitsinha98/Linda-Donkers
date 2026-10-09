import { Arrow } from "../components/Arrow";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { GALLERY, IMG, sm, type GalleryCat } from "../data/site";
import { PageHero } from "../components/PageHero";
import { setScrollLocked } from "../components/SmoothScroll";
import { CtaStrip } from "../components/CtaStrip";
import { usePageTitle } from "../components/usePageTitle";

type Filter = "all" | GalleryCat;

export default function Gallery() {
  const { t } = useLang();
  const g = t.gallery;
  usePageTitle(t.meta.gallery);
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState<number | null>(null);

  const items = useMemo(() => (filter === "all" ? GALLERY : GALLERY.filter((x) => x.cat === filter)), [filter]);

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    setScrollLocked(index !== null);
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, step]);

  useEffect(() => () => setScrollLocked(false), []);

  const filters: Filter[] = ["all", "yoga", "massage", "travel"];

  return (
    <>
      <PageHero eyebrow={g.eyebrow} title={g.title} accent={g.accent} intro={g.intro} image={IMG.heart} alt="Linda in India" position="50% 30%" />

      <section className="py-24 sm:py-32">
        <div className="container-x">
          <div className="flex flex-wrap gap-2" role="tablist">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`relative rounded-full px-5 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  filter === f ? "text-linen" : "text-forest hover:text-saffron"
                }`}
              >
                {filter === f && (
                  <motion.span layoutId="gallery-filter" className="absolute inset-0 -z-10 rounded-full bg-forest" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
                {g.filters[f]}
              </button>
            ))}
          </div>

          <motion.div layout className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
            <AnimatePresence mode="popLayout">
              {items.map((it, i) => (
                <motion.button
                  layout
                  key={it.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  initial={{ opacity: 0, y: 40, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.7, delay: (i % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative block w-full break-inside-avoid overflow-hidden rounded-[1.25rem] bg-sand"
                  aria-label={it.alt}
                >
                  <img
                    src={sm(it.src)}
                    alt={it.alt}
                    loading="lazy"
                    width={it.w}
                    height={it.h}
                    className="h-auto w-full transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                  />
                  <span className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/60 via-transparent to-transparent p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <span className="text-left text-sm text-linen">{it.alt}</span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {index !== null && items[index] && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 p-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={items[index].src}
                src={items[index].src}
                alt={items[index].alt}
                className="max-h-[86vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) step(1);
                  if (info.offset.x > 60) step(-1);
                }}
              />
            </AnimatePresence>
            <button type="button" onClick={close} className="absolute right-5 top-5 h-12 w-12 rounded-full border border-linen/30 text-2xl text-linen" aria-label={g.close}>
              ×
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full border border-linen/30 text-linen sm:block" aria-label={g.prev}>
              <Arrow dir="left" className="mx-auto h-5 w-5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full border border-linen/30 text-linen sm:block" aria-label={g.next}>
              <Arrow className="mx-auto h-5 w-5" />
            </button>
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] text-linen/60">
              {index + 1} / {items.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <CtaStrip />
    </>
  );
}
