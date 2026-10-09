/**
 * "Een reis met Linda": an expanding filmstrip (pattern adapted from the dental clinic site).
 *
 * Desktop: every photo stands side by side as a slim slat; the active one opens wide with its
 * caption while the others fold down. It advances on its own, and hovering, focusing or tapping
 * a slat opens it. Autoplay pauses on hover, when off screen, and under prefers-reduced-motion.
 *
 * Phones: a swipeable snap carousel with the same captions and a progress counter.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { IMG, sm } from "../../data/site";
import { useLang } from "../../i18n/LanguageContext";

const SRC = [IMG.arms, IMG.twist, IMG.selflove, IMG.smile, IMG.happy, IMG.lomi3, IMG.lomi1, IMG.goldenTemple, IMG.heart];
const FOCUS = ["50% 35%", "50% 25%", "50% 25%", "50% 15%", "50% 15%", "50% 5%", "50% 35%", "50% 45%", "50% 25%"];

const AUTOPLAY_MS = 4000;
const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

function useShots() {
  const { t } = useLang();
  return t.home.shots.map((s, i) => ({ ...s, src: SRC[i], focus: FOCUS[i] }));
}

function DesktopStrip() {
  const { t } = useLang();
  const shots = useShots();
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (hovering || !visible || reduce) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % shots.length), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, hovering, visible, reduce, shots.length]);

  return (
    <div
      ref={ref}
      className="flex h-[clamp(26rem,calc(100svh-16rem),40rem)] gap-2"
      onMouseLeave={() => setHovering(false)}
      role="group"
      aria-label={t.home.dayEyebrow}
      data-filmstrip
    >
      {shots.map((s, i) => {
        const open = i === active;
        return (
          <motion.button
            key={s.src}
            type="button"
            onMouseEnter={() => {
              setHovering(true);
              setActive(i);
            }}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-pressed={open}
            aria-label={`${s.label} · ${s.title}`}
            animate={{ flexGrow: open ? 12 : 1 }}
            transition={{ duration: reduce ? 0 : 0.8, ease }}
            style={{ flexBasis: 0 }}
            className="group relative min-w-0 overflow-hidden rounded-[1.25rem] bg-sand text-left"
          >
            <img
              src={s.src}
              alt={`${s.title}: ${s.note}`}
              loading="lazy"
              decoding="async"
              style={{ objectPosition: s.focus }}
              className={`absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "scale-100 saturate-100" : "scale-[1.18] saturate-[0.5] brightness-[0.8] group-hover:brightness-95"
              }`}
            />
            <span
              aria-hidden
              className={`absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent transition-opacity duration-700 ${
                open ? "opacity-100" : "opacity-60"
              }`}
            />

            {/* Folded slat: vertical label */}
            <span
              className={`absolute bottom-6 left-1/2 -translate-x-1/2 rotate-180 whitespace-nowrap text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-linen/85 transition-opacity duration-300 [writing-mode:vertical-rl] ${
                open ? "opacity-0" : "opacity-100"
              }`}
            >
              {s.label}
            </span>

            {/* Open slide: caption */}
            <motion.span
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : 18 }}
              transition={{ duration: 0.55, delay: open ? 0.3 : 0, ease }}
              className="absolute inset-x-0 bottom-0 block p-7 text-linen"
            >
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-saffron-soft">
                {s.label} · {pad(i + 1)} / {pad(shots.length)}
              </span>
              <span className="mt-2 block whitespace-nowrap font-display text-[clamp(1.9rem,2.8vw,2.8rem)] font-light leading-none">
                {s.title}
              </span>
              <span className="mt-3 block max-w-sm text-[0.95rem] text-linen/85">{s.note}</span>
            </motion.span>

            {/* Autoplay progress */}
            {open && !reduce && (
              <motion.span
                key={`${active}-${hovering}-${visible}`}
                aria-hidden
                className="absolute left-0 top-0 h-[3px] bg-saffron"
                initial={{ width: "0%" }}
                animate={{ width: hovering || !visible ? "0%" : "100%" }}
                transition={{ duration: hovering || !visible ? 0 : AUTOPLAY_MS / 1000, ease: "linear" }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function PhoneCarousel() {
  const shots = useShots();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
    setIndex(Math.min(shots.length - 1, Math.round(el.scrollLeft / (w + 12))));
  }, [shots.length]);

  return (
    <div>
      <div
        ref={track}
        onScroll={onScroll}
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {shots.map((s) => (
          <figure key={s.src} className="relative aspect-[3/4] w-[80%] shrink-0 snap-start overflow-hidden rounded-[1.25rem] bg-sand sm:w-[46%]">
            <img
              src={sm(s.src)}
              alt={`${s.title}: ${s.note}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: s.focus }}
            />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 text-linen">
              <span className="text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-saffron-soft">{s.label}</span>
              <span className="mt-1.5 block font-display text-[1.8rem] font-light leading-none">{s.title}</span>
              <span className="mt-1.5 block text-sm text-linen/85">{s.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <div className="relative h-px flex-1 bg-forest/15" aria-hidden>
          <span
            className="absolute inset-y-0 left-0 bg-saffron transition-[width] duration-300"
            style={{ width: `${((index + 1) / shots.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums tracking-[0.2em] text-forest/60">
          {pad(index + 1)} / {pad(shots.length)}
        </span>
      </div>
    </div>
  );
}

export function Filmstrip() {
  const { t } = useLang();
  const h = t.home;
  return (
    <section className="border-t border-forest/10 py-24 lg:py-32">
      <div className="container-x">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease }}
          className="grid gap-6 lg:grid-cols-12 lg:items-end"
        >
          <div className="lg:col-span-7">
            <span className="eyebrow">{h.dayEyebrow}</span>
            <h2 className="display-lg mt-6 text-ink">
              {h.dayTitle}
              <em className="italic-accent">{h.dayAccent}</em>
            </h2>
          </div>
          <p className="lead lg:col-span-4 lg:col-start-9">
            {h.dayText} <span className="hidden lg:inline">{h.dayHintDesktop}</span>
            <span className="lg:hidden">{h.dayHintMobile}</span>
          </p>
        </motion.div>

        <div className="mt-14 hidden lg:block">
          <DesktopStrip />
        </div>
        <div className="mt-10 lg:hidden">
          <PhoneCarousel />
        </div>
      </div>
    </section>
  );
}
