import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Arrow } from "../components/Arrow";
import { useLang } from "../i18n/LanguageContext";
import { GALLERY, IMG, sm, type GalleryCat } from "../data/site";
import { PageHero } from "../components/PageHero";
import { setScrollLocked } from "../components/SmoothScroll";
import { Filmstrip } from "../components/gallery/Filmstrip";
import { CtaStrip } from "../components/CtaStrip";
import { usePageTitle } from "../components/usePageTitle";

type Filter = "all" | GalleryCat;
const pad = (n: number) => String(n).padStart(2, "0");

export default function Gallery() {
  const { t } = useLang();
  const g = t.gallery;
  usePageTitle(t.meta.gallery);
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState<number | null>(null);

  const items = useMemo(() => (filter === "all" ? GALLERY : GALLERY.filter((x) => x.cat === filter)), [filter]);
  const caption = (key: string) => g.captions[key as keyof typeof g.captions];

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
  const current = index !== null ? items[index] : null;

  return (
    <>
      <PageHero eyebrow={g.eyebrow} title={g.title} accent={g.accent} intro={g.intro} image={IMG.heart} alt="Linda in India" position="50% 30%" />

      <Filmstrip />

      <section className="border-t border-forest/10 py-24 sm:py-32">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <span className="eyebrow">{g.gridEyebrow}</span>
            <div className="flex flex-wrap gap-2" role="tablist">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`relative z-0 rounded-full border px-5 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    filter === f ? "border-forest text-linen" : "border-forest/15 text-forest hover:border-forest"
                  }`}
                >
                  {filter === f && (
                    <motion.span
                      layoutId="gallery-filter"
                      className="absolute inset-0 -z-10 rounded-full bg-forest"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {g.filters[f]}
                </button>
              ))}
            </div>
          </div>

          <motion.div layout className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
            <AnimatePresence>
              {items.map((it, i) => (
                <motion.button
                  layout
                  key={it.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="group mb-8 block w-full break-inside-avoid text-left"
                  aria-label={caption(it.key)}
                >
                  <span
                    className={`relative block overflow-hidden rounded-[1.25rem] bg-sand ${
                      it.w > it.h ? "aspect-[16/10]" : "aspect-[3/4]"
                    }`}
                  >
                    <img
                      src={sm(it.src)}
                      alt={it.alt}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/10" />
                  </span>
                  <span className="mt-3 flex justify-between gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-forest/55">
                    <span className="transition-colors group-hover:text-saffron">{caption(it.key)}</span>
                    <span className="shrink-0">{g.filters[it.cat]}</span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {current && index !== null && (
          <motion.div
            className="fixed inset-0 z-[90] flex flex-col bg-ink/95 text-linen backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={caption(current.key)}
          >
            <div className="flex items-center justify-between gap-4 p-4 text-[0.7rem] font-semibold uppercase tracking-[0.24em] sm:p-6">
              <span className="truncate">
                {pad(index + 1)} / {pad(items.length)} · {caption(current.key)}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label={g.close}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-linen/25 text-xl"
              >
                ×
              </button>
            </div>
            <div className="relative flex-1">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current.src}
                  src={current.src}
                  alt={current.alt}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) step(1);
                    if (info.offset.x > 60) step(-1);
                  }}
                  className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain"
                />
              </AnimatePresence>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={g.prev}
                className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-linen/10 transition-colors hover:bg-saffron"
              >
                <Arrow dir="left" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={g.next}
                className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-linen/10 transition-colors hover:bg-saffron"
              >
                <Arrow className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CtaStrip />
    </>
  );
}
