import { Arrow } from "./Arrow";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { EMAIL, PHONE_DISPLAY, ROUTES, SOCIALS, WHATSAPP } from "../data/site";
import { LogoMark } from "./Logo";
import { scrollToTop } from "./SmoothScroll";

export function Footer() {
  const { t } = useLang();
  const explore = [
    { to: ROUTES.about, label: t.nav.about },
    { to: ROUTES.yoga, label: t.nav.yoga },
    { to: ROUTES.massage, label: t.nav.massage },
    { to: ROUTES.agenda, label: t.nav.agenda },
    { to: ROUTES.travel, label: t.nav.travel },
    { to: ROUTES.gallery, label: t.nav.gallery },
    { to: ROUTES.contact, label: t.nav.contact },
  ];

  return (
    <footer className="relative overflow-hidden bg-ink text-linen">
      <div className="container-x pb-28 pt-24 lg:pb-10">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <LogoMark className="h-14 w-14 text-linen" strokeWidth={2.6} />
            <p className="mt-6 max-w-sm font-display text-2xl font-light leading-snug text-linen/90">
              {t.footer.tagline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            <div>
              <h3 className="font-sans text-[0.7rem] font-bold uppercase tracking-[0.3em] text-saffron-soft">
                {t.footer.explore}
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-linen/70">
                {explore.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="transition-colors hover:text-linen">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-[0.7rem] font-bold uppercase tracking-[0.3em] text-saffron-soft">
                {t.footer.contact}
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-linen/70">
                <li>
                  <a href={`mailto:${EMAIL}`} className="break-all transition-colors hover:text-linen">
                    {EMAIL}
                  </a>
                </li>
                <li>
                  <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="hover:text-linen">
                    WhatsApp {PHONE_DISPLAY}
                  </a>
                </li>
                <li>{t.contact.location}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-[0.7rem] font-bold uppercase tracking-[0.3em] text-saffron-soft">
                {t.contact.socials}
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-linen/70">
                {SOCIALS.map((s) => (
                  <li key={s.name}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="hover:text-linen">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none mt-20 select-none whitespace-nowrap text-center font-display font-light leading-none text-linen/[0.06]"
          style={{ fontSize: "clamp(4rem, 15vw, 15rem)" }}
        >
          Linda Donkers
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-linen/10 pt-6 text-xs text-linen/50 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} Linda Donkers · Diamond Yoga · 2LovingHands. {t.footer.rights}
          </p>
          <div className="flex items-center gap-6">
            <Link to={ROUTES.privacy} className="hover:text-linen">
              {t.footer.privacy}
            </Link>
            <Link to={ROUTES.terms} className="hover:text-linen">
              {t.footer.terms}
            </Link>
            <button type="button" onClick={() => scrollToTop()} className="hover:text-saffron-soft">
              {t.footer.top} <Arrow dir="up" className="ml-1 h-3.5 w-3.5 align-[-2px]" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
