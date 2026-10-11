import { SOCIALS, type SocialIcon } from "../data/site";

const PATHS: Record<SocialIcon, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </>
  ),
  facebook: <path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.6V21h2.9z" />,
  youtube: (
    <path
      fill="currentColor"
      d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z"
    />
  ),
  linkedin: (
    <path
      fill="currentColor"
      d="M6.9 8.6H3.8V20h3.1V8.6zM5.4 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM20.2 13.4c0-3.1-1.7-4.9-4.3-4.9a3.7 3.7 0 0 0-3.3 1.8V8.6H9.6V20h3.1v-5.8c0-1.6.6-2.8 2.1-2.8 1.4 0 2.3 1 2.3 2.8V20h3.1v-6.6z"
    />
  ),
  threads: (
    <path
      fill="currentColor"
      d="M16.7 11.2l-.3-.1c-.2-2.8-1.7-4.4-4.3-4.4h-.1c-1.5 0-2.8.7-3.6 1.9l1.4 1c.6-.9 1.5-1.1 2.2-1.1h.1c.9 0 1.5.3 1.9.8.3.4.5.9.6 1.5a10 10 0 0 0-2.3-.1c-2.3.1-3.8 1.5-3.7 3.4a3.1 3.1 0 0 0 1.5 2.5 4.6 4.6 0 0 0 2.7.7 4 4 0 0 0 3.1-1.5 5.6 5.6 0 0 0 1-2.7 3 3 0 0 1 1.3 1.4 3.4 3.4 0 0 1-.8 3.8c-1 1-2.3 1.5-4.2 1.5-2.1 0-3.7-.7-4.8-2a8 8 0 0 1-1.6-5.2c0-2.2.6-4 1.6-5.2 1.1-1.3 2.7-2 4.8-2s3.7.7 4.8 2c.6.7 1 1.5 1.3 2.4l1.6-.4a7.8 7.8 0 0 0-1.6-3.1C16.8 3.9 14.8 3 12.2 3h-.1C9.5 3 7.5 3.9 6.1 5.6A9.7 9.7 0 0 0 4.2 12c0 2.7.7 4.9 1.9 6.4 1.4 1.7 3.4 2.6 6 2.6h.1c2.3 0 3.9-.6 5.3-2a5 5 0 0 0 1.2-5.6 4.6 4.6 0 0 0-2-2.2zm-4 3.9c-1 .1-2-.4-2.1-1.3 0-.7.5-1.4 2-1.5h.6c.6 0 1.1 0 1.6.2-.2 2.2-1.2 2.5-2.1 2.6z"
    />
  ),
};

export function SocialGlyph({ icon, className = "h-5 w-5" }: { icon: SocialIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {PATHS[icon]}
    </svg>
  );
}

/** Round icon buttons for every channel. `tone` adapts colours to light or dark backgrounds. */
export function SocialIcons({ tone = "light", size = "md", className = "" }: { tone?: "light" | "dark"; size?: "sm" | "md"; className?: string }) {
  const styles =
    tone === "dark"
      ? "border-linen/25 text-linen hover:border-saffron-soft hover:bg-saffron-soft hover:text-ink"
      : "border-forest/20 text-forest hover:border-saffron hover:bg-saffron hover:text-linen";
  return (
    <ul className={`flex flex-wrap ${size === "sm" ? "gap-1.5" : "gap-2.5"} ${className}`}>
      {SOCIALS.map((s) => (
        <li key={s.href}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.name}: ${s.label}`}
            title={`${s.name} · ${s.label}`}
            className={`grid ${size === "sm" ? "h-9 w-9" : "h-11 w-11"} place-items-center rounded-full border transition-colors duration-300 ${styles}`}
          >
            <SocialGlyph icon={s.icon} className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Larger cards with the page name, for the "Follow Linda" section and the contact page. */
export function SocialCards() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SOCIALS.map((s) => (
        <li key={s.href}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-forest/10 bg-linen px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-saffron/50 hover:shadow-[0_20px_40px_-28px_rgba(46,58,47,0.5)]"
            data-cursor="hover"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-linen transition-colors duration-300 group-hover:bg-saffron">
              <SocialGlyph icon={s.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sage">{s.name}</span>
              <span className="block truncate font-display text-lg text-ink transition-colors group-hover:text-saffron">{s.label}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
