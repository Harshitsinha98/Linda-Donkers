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

## Agenda, coupons & memberships

- **Agenda sections:** `/agenda` has three tabs: **Yoga** (live classes), **Massage & healing** and **Online** (every online session, whatever its type), plus "All". Old `?cat=` links keep working.
- **Photos:** each session shows Linda's upload, else the photo she picks in the session form, else a default per session type (all different). Every photo has a focal point (`shared/catalog.ts`, `COVERS`) so wide cards show her face, not her torso.
- **Standard schedule:** Admin → Sessions → **Reset to standard schedule** deletes every session without an active booking and creates the weekly classes for 12 weeks (Mon 19:30 + Wed 09:30 group class €22, Fri 08:00 online class in English €15, Sat 09:30 private session €90, Sat 11:30 online coaching €90), plus one hidden draft of each massage and healing (M.E.R. €140, Lomi Lomi €140, Chi Nei Tsang €90, Sat Nam Rasayan live/online €44) to date and publish. Sessions with paid bookings are kept. The offer lives in `shared/schedule.ts`; the same list fills "Start from a template" in the New session form.
- **Coupons:** Admin → Coupons. Percentage or fixed amount; for sessions, memberships or both; optionally only certain session types, a date range, a maximum number of uses and once per email. Customers enter the code in the booking or membership form (`POST /api/coupon` previews it, the checkout applies it again on the server). Uses are counted from confirmed and in-payment bookings/passes. Used coupons can't be deleted, only switched off.
- **Memberships:** Admin → Memberships. Linda creates plans (name, price, number of sessions, validity in days, which session types it covers). Customers buy them on `/lidmaatschap` (login required, Stripe Checkout), get an email with the pass code and details, and see credits on `/account`. When booking a covered session while logged in they can choose "Use my membership": 1 credit per person, taken in one atomic update. Cancel ≥48h before and the credit comes back. Linda can add a pass she sold herself (cash) on the customer's email, and correct credits or extend the end date. The plan's terms are copied onto each sold pass, so editing a plan never changes what someone already bought.
- **Login:** Supabase Auth (Google or a one-time email link). Supabase is only used for identity; the API checks the customer's token with `GET {SUPABASE_URL}/auth/v1/user` using the public key and matches passes on user id or verified email. No Supabase secret key is used anywhere.

API: `POST /api/coupon`, `GET|POST /api/memberships`, `/api/admin/coupons`, `/api/admin/memberships`. That's 12 functions in total, the limit of Vercel's Hobby plan; group new endpoints into existing files or upgrade before adding more.

### Supabase setup

1. Create a project at supabase.com (region EU, e.g. Frankfurt).
2. **Authentication → Sign In / Providers → Google:** enable it with a Google OAuth client (Google Cloud Console → APIs & Services → Credentials → OAuth client ID, type *Web application*). Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase.
3. **Authentication → URL Configuration:** Site URL `https://www.lindadonkers.com`; Redirect URLs `https://www.lindadonkers.com/**` (and `http://localhost:5173/**` for development).
4. Email links work out of the box with Supabase's built-in mailer (low rate limit). For production, set **Authentication → Emails → SMTP** to Resend (`smtp.resend.com`, port 465, user `resend`, password = your Resend API key).
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy (the website needs them at build time).

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
| Session types, photos + focal points, agenda sections | `shared/catalog.ts` |
| Standard weekly schedule & templates | `shared/schedule.ts` |
| Starter membership plans | `server/memberships.ts` (`DEFAULT_PLANS`) |
| Colours & fonts | `src/index.css` (`@theme`) |
| Photos | `public/images/` (`name.webp` + `name-sm.webp`, max ~1600px) |
| Logo / favicon | `src/components/Logo.tsx`, `public/favicon.svg` |

## Deploy (Vercel)

Framework preset: Vite. `vercel.json` rewrites all routes except `/api/*` to `index.html`, so links like `/kundalini-yoga` work when opened directly. Add the environment variables from `.env.example`.
