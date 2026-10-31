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

### Booking sections, discount codes & memberships

- **Agenda** has three sections: Yoga, Massage & healing, Online. Classes have fixed dates; massages and healings are booked **by appointment** (the customer pays and gives a preferred day/time, Linda confirms it). Every session has its own photo (pick one of Linda's photos in the session form, or upload one); photos are cropped on her face, not the middle of the picture.
- **Reset to standard schedule** (admin → Sessions): deletes every session nobody has booked and creates the regular offer from `shared/catalog.ts` (weekly classes for N weeks + the appointment sessions). Booked sessions are kept and listed.
- **Discount codes** (admin → Coupons): % or € off, valid for everything / a section / memberships, date range, total uses, uses per email, minimum amount. Entered on the booking form and on the membership form; checked again on the server at checkout. A use is reserved when checkout starts and released if the payment doesn't complete.
- **Memberships** (admin → Memberships): Linda defines cards (price, number of sessions or unlimited, validity in days, which sessions it covers). Sold on `/lidmaatschap` via Stripe; the buyer must be logged in. After payment the customer gets an email with the details. Logged-in customers see their cards and bookings on `/account`, and can choose "Pay with my membership" when booking (1 session off the card, returned when cancelled 48h+ before). Linda can also add a card for someone who paid cash, adjust sessions/end date, or cancel (with Stripe refund).
- **Login**: Supabase Auth, Google (Gmail) or an email login link. Supabase is only used for identity; all data stays in Turso. The API verifies the token with Supabase (`server/auth.ts`).

### Supabase setup (login)

1. Create a project at supabase.com. In Project Settings → API copy the **Project URL** and the **anon / publishable key** into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Vercel, all environments), then redeploy.
2. Authentication → URL Configuration: Site URL `https://www.lindadonkers.com`, and add redirect URLs `https://www.lindadonkers.com/**` and `http://localhost:5173/**`.
3. Authentication → Sign In / Providers → **Google**: enable it with a Client ID and Secret from Google Cloud Console (APIs & Services → Credentials → OAuth client ID, type Web; authorised redirect URI = the callback URL Supabase shows, `https://<project>.supabase.co/auth/v1/callback`).
4. Email (magic link) works out of the box with Supabase's test mailer (low hourly limit). For production, set custom SMTP in Authentication → Emails (e.g. Resend's SMTP) so login emails come from lindadonkers.com.

API: `GET /api/sessions`, `POST /api/checkout`, `GET|POST /api/booking`, `POST /api/stripe-webhook`, `/api/admin/sessions`, `/api/admin/bookings`, `POST /api/coupon`, `GET /api/memberships`, `POST /api/membership-checkout`, `GET /api/account`, `/api/admin/coupons`, `/api/admin/memberships`. Shared server code is in `server/`.

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
| Regular offer, prices, default photos, standard membership cards | `shared/catalog.ts` |
| Colours & fonts | `src/index.css` (`@theme`) |
| Photos | `public/images/` (`name.webp` + `name-sm.webp`, max ~1600px) |
| Logo / favicon | `src/components/Logo.tsx`, `public/favicon.svg` |

## Deploy (Vercel)

Framework preset: Vite. `vercel.json` rewrites all routes except `/api/*` to `index.html`, so links like `/kundalini-yoga` work when opened directly. Add the environment variables from `.env.example`.
