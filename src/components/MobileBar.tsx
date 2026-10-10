import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { PHONE_TEL, ROUTES, waLink } from "../data/site";

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

/** Thumb-reach actions on phones: Call, WhatsApp, Book a session. Hidden while booking. */
export function MobileBar() {
  const { t } = useLang();
  const { pathname } = useLocation();
  const isHome = pathname === ROUTES.home;
  // On the home page the hero already has a Book button, so the bar slides in after scrolling past it.
  const [show, setShow] = useState(!isHome);

  useEffect(() => {
    if (!isHome) {
      setShow(true);
      return;
    }
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const hidden = pathname.startsWith(`${ROUTES.agenda}/`) || pathname.startsWith(ROUTES.booking);
  if (hidden) return null;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex gap-2 rounded-full bg-ink/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(29,36,30,0.55)] backdrop-blur transition-[transform,opacity] duration-500 lg:hidden ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0"
      }`}
    >
      <a href={PHONE_TEL} aria-label={t.mobileBar.call} tabIndex={show ? 0 : -1} className="grid h-12 w-12 place-items-center rounded-full text-linen">
        <PhoneIcon />
      </a>
      <a
        href={waLink(t.mobileBar.whatsappText)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.mobileBar.whatsapp}
        tabIndex={show ? 0 : -1}
        className="grid h-12 w-12 place-items-center rounded-full text-linen"
      >
        <WhatsAppIcon />
      </a>
      <Link
        to={ROUTES.agenda}
        tabIndex={show ? 0 : -1}
        className="flex flex-1 items-center justify-center rounded-full bg-saffron text-[0.95rem] font-semibold text-linen"
      >
        {t.mobileBar.book}
      </Link>
    </div>
  );
}
