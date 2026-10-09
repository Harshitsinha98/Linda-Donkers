# Linda Donkers – Diamond Yoga & 2LovingHands

Website for Linda Donkers: Kundalini Yoga, gong meditation, Lomi Lomi Nui massage and Ayurveda journeys to India (Deurne, Antwerp).

- Dutch (nl-BE) by default, English via the NL | EN toggle (saved in the browser, or `?lang=en`)
- React + Vite + TypeScript, Tailwind CSS v4, Framer Motion, Lenis smooth scroll
- Only Linda's own photos (AI images from the old site removed)

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build in dist/
```

## Where to change things

| What | File |
| --- | --- |
| All texts (NL + EN) | `src/i18n/content.ts` |
| Email, WhatsApp, socials, gallery list | `src/data/site.ts` |
| Colours & fonts | `src/index.css` (`@theme`) |
| Photos | `public/images/` (`name.webp` + `name-sm.webp`, max ~1600px) |
| Logo / favicon | `src/components/Logo.tsx`, `public/favicon.svg` |

## Deploy (Vercel)

Framework preset: Vite. `vercel.json` rewrites all routes to `index.html`, so links like `/kundalini-yoga` work when opened directly.
