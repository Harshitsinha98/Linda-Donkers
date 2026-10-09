import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES, EMAIL, SOCIALS } from "../data/site";
import { Logo } from "./Logo";
import { Magnetic } from "./Magnetic";
import { setScrollLocked } from "./SmoothScroll";

export function LangToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      role="group"
      aria-label={t.nav.langLabel}
      className={`relative flex items-center rounded-full border p-1 text-[0.7rem] font-bold tracking-[0.18em] ${
        light ? "border-linen/30 text-linen" : "border-forest/20 text-forest"
      }`}
    >
      {(["nl", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className="relative z-10 rounded-full px-3 py-1.5 uppercase transition-colors duration-300"
          style={{ color: lang === l ? "var(--color-linen)" : undefined }}
        >
          {lang === l && (
            <motion.span
              layoutId={light ? "lang-pill-menu" : "lang-pill"}
              className={`absolute inset-0 -z-10 rounded-full ${light ? "bg-saffron" : "bg-forest"}`}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          {l}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useLang();
  const { pathname } = useLocation();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(v > 40);
    setHidden(v > 400 && v > prev && !open);
  });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    setScrollLocked(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { to: ROUTES.about, label: t.nav.about },
    { to: ROUTES.yoga, label: t.nav.yoga },
    { to: ROUTES.massage, label: t.nav.massage },
    { to: ROUTES.travel, label: t.nav.travel },
    { to: ROUTES.gallery, label: t.nav.gallery },
    { to: ROUTES.contact, label: t.nav.contact },
  ];

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden ? "-110%" : "0%" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`transition-all duration-500 ${
            scrolled ? "bg-cream/80 py-3 shadow-[0_1px_0_rgba(46,58,47,0.08)] backdrop-blur-xl" : "py-5 sm:py-7"
          }`}
        >
          <div className="container-x flex items-center justify-between gap-6">
            <Link to={ROUTES.home} aria-label="Linda Donkers – home" data-cursor="hover">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-1 xl:flex" aria-label="Hoofdmenu">
              {links.slice(0, 5).map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `group relative px-3 py-2 text-[0.85rem] font-medium transition-colors ${
                      isActive ? "text-saffron" : "text-forest hover:text-saffron"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {l.label}
                      <span
                        className={`absolute bottom-1 left-3 right-3 h-px origin-left bg-saffron transition-transform duration-500 ${
                          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <LangToggle />
              </div>
              <Magnetic>
                <Link
                  to={ROUTES.contact}
                  className="hidden rounded-full bg-forest px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-linen transition-colors duration-300 hover:bg-saffron lg:inline-flex"
                >
                  {t.nav.book}
                </Link>
              </Magnetic>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-forest/20 xl:hidden"
                aria-label={t.nav.menu}
                aria-expanded={open}
              >
                <span className="h-px w-5 bg-forest" />
                <span className="h-px w-3.5 translate-x-[3px] bg-forest" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-forest text-linen"
            initial={{ clipPath: "circle(0% at calc(100% - 44px) 44px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 44px) 44px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 44px) 44px)" }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="container-x flex items-center justify-between py-5">
              <Link to={ROUTES.home}>
                <Logo light />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-linen/30 text-xl"
                aria-label={t.nav.close}
              >
                ×
              </button>
            </div>
            <nav className="container-x flex flex-1 flex-col justify-center gap-1" aria-label="Mobiel menu">
              {[{ to: ROUTES.home, label: t.nav.home }, ...links].map((l, i) => (
                <div key={l.to} className="overflow-hidden">
                  <motion.div
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "110%" }}
                    transition={{ duration: 0.8, delay: 0.25 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <NavLink
                      to={l.to}
                      className={({ isActive }) =>
                        `group flex items-baseline gap-4 font-display text-[clamp(2.2rem,8vw,4rem)] font-light leading-[1.15] ${
                          isActive ? "text-saffron-soft" : ""
                        }`
                      }
                    >
                      <span className="font-sans text-xs tracking-widest text-linen/40">0{i + 1}</span>
                      <span className="transition-transform duration-500 group-hover:translate-x-3 group-hover:italic">
                        {l.label}
                      </span>
                    </NavLink>
                  </motion.div>
                </div>
              ))}
            </nav>
            <motion.div
              className="container-x flex flex-wrap items-center justify-between gap-4 border-t border-linen/15 py-6 text-sm text-linen/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <LangToggle light />
              <a href={`mailto:${EMAIL}`} className="hover:text-saffron-soft">
                {EMAIL}
              </a>
              <div className="flex gap-4">
                {SOCIALS.slice(0, 3).map((s) => (
                  <a key={s.name} href={s.href} target="_blank" rel="noreferrer" className="hover:text-saffron-soft">
                    {s.name}
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
