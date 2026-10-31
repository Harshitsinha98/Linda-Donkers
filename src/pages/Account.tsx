import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES } from "../data/site";
import { fmtDate, fmtEuro, fmtLong, photoFocus, photoSrc, type MembershipView } from "../lib/api";
import { useAuth } from "../lib/auth";
import { LoginBox } from "../components/LoginBox";
import { Button } from "../components/Magnetic";
import { RevealText } from "../components/Reveal";
import { usePageTitle } from "../components/usePageTitle";

type AccountBooking = {
  ref: string;
  manageUrl: string;
  status: "confirmed" | "cancelled";
  seats: number;
  amountCents: number;
  paidWithMembership: boolean;
  preferred: string;
  title: { nl: string; en: string };
  startsAt: string;
  bookingMode: "scheduled" | "appointment";
  isOnline: boolean;
  venue: string;
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-[#e7f3e4] text-forest",
  pending: "bg-amber-100 text-amber-800",
  expired: "bg-sand text-forest/60",
  cancelled: "bg-sand text-forest/60",
};

function MembershipCard({ m }: { m: MembershipView }) {
  const { t, lang } = useLang();
  const a = t.account;
  const used = m.creditsTotal ? Math.min(100, Math.round((m.creditsUsed / m.creditsTotal) * 100)) : 0;
  return (
    <div className="flex gap-5 rounded-[1.6rem] border border-forest/10 bg-linen p-5">
      <img
        src={photoSrc(m.photo || "portrait").replace(".webp", "-sm.webp")}
        alt=""
        style={{ objectPosition: photoFocus(m.photo || "portrait") }}
        className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-display text-xl leading-snug text-ink">{m.name[lang]}</p>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[m.status] ?? ""}`}>{a.status[m.status] ?? m.status}</span>
        </div>
        <p className="mt-2 font-semibold text-forest">{a.left(m.creditsLeft, m.creditsTotal)}</p>
        {m.creditsTotal > 0 && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-sage" style={{ width: `${100 - used}%` }} />
          </div>
        )}
        <p className="mt-2 text-sm text-forest/60">
          {m.expiresAt ? a.validUntil(fmtDate(m.expiresAt, lang)) : ""} · {m.ref}
        </p>
      </div>
    </div>
  );
}

export default function Account() {
  const { t, lang } = useLang();
  const a = t.account;
  usePageTitle(t.meta.account);
  const auth = useAuth();
  const [params] = useSearchParams();
  const justPaid = params.get("paid") === "1";
  const [data, setData] = useState<{ memberships: MembershipView[]; bookings: AccountBooking[] } | null>(null);
  const [error, setError] = useState(false);
  const [polls, setPolls] = useState(0);

  const load = useCallback(() => {
    auth
      .authApi<{ memberships: MembershipView[]; bookings: AccountBooking[] }>("/api/account")
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, [auth]);

  useEffect(() => {
    if (auth.email) load();
    else setData(null);
  }, [auth.email, load]);

  // Coming back from Stripe: check again until the payment is confirmed.
  const pending = !!data?.memberships.some((m) => m.status === "pending");
  useEffect(() => {
    if (!pending || polls > 20) return;
    const id = window.setTimeout(() => {
      load();
      setPolls((p) => p + 1);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [pending, polls, load]);

  return (
    <section className="pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="container-x max-w-4xl">
        <h1 className="display-lg text-ink">
          <RevealText text={a.title} immediate delay={0.2} />
          <RevealText text={a.accent} immediate delay={0.35} className="italic-accent" />
        </h1>

        {!auth.ready ? (
          <p className="mt-10 text-forest/60" role="status">
            {a.loading}
          </p>
        ) : !auth.email ? (
          <motion.div className="mt-10 max-w-lg rounded-[2rem] bg-linen p-7 sm:p-9" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-display text-3xl font-light text-ink">{a.loginTitle}</h2>
            <p className="mb-6 mt-3 text-forest/75">{a.loginText}</p>
            <LoginBox />
          </motion.div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-forest/70">
              <span>{a.loggedInAs(auth.email)}</span>
              <button type="button" onClick={() => auth.signOut()} className="text-sm font-semibold underline underline-offset-4 hover:text-saffron">
                {a.logout}
              </button>
            </div>

            {justPaid && <p className="mt-8 rounded-xl bg-[#e7f3e4] px-5 py-4 text-forest">{a.paidBanner}</p>}
            {error && <p className="mt-8 text-[#a2470b]">{a.error}</p>}

            <h2 className="mt-12 font-display text-3xl font-light text-ink">{a.memberships}</h2>
            {!data ? (
              <p className="mt-4 text-forest/60">{a.loading}</p>
            ) : data.memberships.length === 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <p className="text-forest/70">{a.noMemberships}</p>
                <Button to={ROUTES.memberships} variant="ghost">
                  {a.buyOne}
                </Button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {data.memberships.map((m) => (
                  <MembershipCard key={m.id} m={m} />
                ))}
              </div>
            )}

            <h2 className="mt-14 font-display text-3xl font-light text-ink">{a.bookings}</h2>
            {data && data.bookings.length === 0 && <p className="mt-4 text-forest/70">{a.noBookings}</p>}
            {data && data.bookings.length > 0 && (
              <ul className="mt-5 divide-y divide-forest/10 rounded-[1.6rem] border border-forest/10 bg-linen">
                {data.bookings.map((b) => (
                  <li key={b.ref} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{b.title[lang]}</p>
                      <p className="text-sm text-forest/60 first-letter:uppercase">
                        {b.bookingMode === "appointment" ? `${t.agenda.appointment}${b.preferred ? ` · ${b.preferred}` : ""}` : fmtLong(b.startsAt, lang)} ·{" "}
                        {b.paidWithMembership ? t.booking.status.paidWithMembership : fmtEuro(b.amountCents, lang)}
                        {b.status === "cancelled" ? ` · ${t.account.status.cancelled}` : ""}
                      </p>
                    </div>
                    <Link to={b.manageUrl} className="text-sm font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                      {a.manage}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-10">
              <Button to={ROUTES.agenda}>{a.bookNow}</Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
