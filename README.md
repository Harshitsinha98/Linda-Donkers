# Linda Donkers – Diamond Yoga & 2LovingHands

Website for Linda Donkers: Kundalini Yoga, gong meditation, holistic massages and Ayurveda travels to India (Deurne, Antwerp), with online booking, Stripe payments and an admin panel.

- Dutch (nl-BE) by default, English via the NL | EN toggle (saved in the browser, or `?lang=en`)
- React + Vite + TypeScript, Tailwind CSS v4, Framer Motion, Lenis smooth scroll
- Vercel Functions (`api/`) + Turso (SQLite) + Stripe + Resend for bookings
- Only Linda's own photos (AI images from the old site removed)

## Develop

```bash
npm install
cp .env.example .env.local   # set at least ADMIN_PASSCODE (8+ characters)
npm run dev      # site + /api functions; data goes to a local SQLite file in ./data
npm run build    # typecheck (site + api) + production build in dist/
```

## Bookings, payments & admin

- **Admin panel:** `/admin` (not linked anywhere), log in with `ADMIN_PASSCODE`. Linda creates any kind of session there: yoga, gong, workshop, massage, healing, online, retreat. For each one she sets the date, time (Belgian time), venue or online link, duration, number of places, max people per booking and the price. She can also repeat a session weekly, duplicate it, hide or publish it, and cancel it (everyone gets a full refund and an email). Per session she can see the bookings, add bookings herself (WhatsApp or cash), cancel a booking with a refund and export a CSV.
- **Website:** published upcoming sessions show on the homepage ("Upcoming sessions") and in `/agenda`. `/agenda/:id` has the booking form. `/boeking/:ref` is the confirmation page, with a "Share on WhatsApp" button for Linda and self-cancellation.
- **Payments:** Stripe Checkout in EUR with Adaptive Pricing, so visitors see and pay the price in their own currency while Linda receives EUR. A place is held for 35 minutes while the customer pays. Capacity is enforced in one atomic SQL statement, so a session can't be overbooked.
- **Cancellation policy:** 48h or more before the session: 100% refund. 24–48h: 50%. Under 24h: 0%. Refunds go through Stripe automatically. If Linda cancels a session, everyone gets 100%.
- **Emails (Resend):** booking confirmation to the customer (with manage/cancel link and WhatsApp button) and a "new booking" email to Linda (`ADMIN_EMAIL`), plus cancellation emails. If Resend isn't configured, bookings still work and the emails are skipped (logged).

API: `GET /api/sessions`, `POST /api/checkout`, `GET|POST /api/booking`, `POST /api/stripe-webhook`, `/api/admin/sessions`, `/api/admin/bookings`. Shared server code is in `server/`.

### Go-live checklist

1. **Turso:** create a database at turso.tech, then set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. The tables are created automatically.
2. **Stripe** (Linda's own account, test mode first):
   - In Settings → Payment methods, enable Cards, Bancontact, Apple Pay / Google Pay and iDEAL.
   - In Settings → Checkout, turn on Adaptive Pricing.
   - In Developers → Webhooks, add `https://www.lindadonkers.com/api/stripe-webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`.
   - Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
3. **Resend:** add and verify the domain `lindadonkers.com` (DNS records). Then set `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Linda Donkers <bookings@lindadonkers.com>`) and `ADMIN_EMAIL`.
4. Set `ADMIN_PASSCODE` and `SITE_URL` in Vercel, then redeploy.
5. Book a test session with card `4242 4242 4242 4242`. After that, switch to the live keys and the live webhook secret.

## Where to change things

| What | File |
| --- | --- |
| All texts (NL + EN) | `src/i18n/content.ts` |
| Email, WhatsApp, socials, gallery list | `src/data/site.ts` |
| Booking emails | `server/email.ts` |
| Refund policy | `server/bookings.ts` (`refundPercent`) + texts in `content.ts` |
| Admin panel | `src/admin/` |
| Colours & fonts | `src/index.css` (`@theme`) |
| Photos | `public/images/` (`name.webp` + `name-sm.webp`, max ~1600px) |
| Logo / favicon | `src/components/Logo.tsx`, `public/favicon.svg` |

## Deploy (Vercel)

Framework preset: Vite. `vercel.json` rewrites all routes except `/api/*` to `index.html`, so links like `/kundalini-yoga` work when opened directly. Add the environment variables from `.env.example`.
