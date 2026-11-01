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

type Group = "upcoming" | "completed" | "cancelled";
const GROUPS: Group[] = ["upcoming", "completed", "cancelled"];

type AccountBooking = {
  ref: string;
  manageUrl: string;
  group: Group;
  status: "confirmed" | "cancelled";
  seats: number;
  amountCents: number;
  giftCents: number;
  paidWithMembership: boolean;
  preferred: string;
  title: { nl: string; en: string };
  startsAt: string;
  undated: boolean;
  bookingMode: "scheduled" | "appointment";
  isOnline: boolean;
  venue: string;
  refundedCents: number;
  giftRefundedCents: number;
  creditReturned: boolean;
};

type Refund = {
  kind: "booking" | "membership";
  ref: string;
  title: { nl: string; en: string };
  date: string | null;
  toCardCents: number;
  toGiftCardCents: number;
  creditReturned: boolean;
  manageUrl: string;
};

type AccountGift = {
  ref: string;
  code: string;
  balanceCents: number;
  initialCents: number;
  expiresAt: string | null;
  status: string;
  role: "received" | "bought";
  recipientName: string;
};

type AccountData = { memberships: MembershipView[]; bookings: AccountBooking[]; refunds: Refund[]; giftCards: AccountGift[] };

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
  const [data, setData] = useState<AccountData | null>(null);
  const [tab, setTab] = useState<Group>("upcoming");
  const [error, setError] = useState(false);
  const [polls, setPolls] = useState(0);

  const load = useCallback(() => {
    auth
      .authApi<AccountData>("/api/account")
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
            <div role="tablist" aria-label={a.bookings} className="mt-5 inline-flex flex-wrap gap-1 rounded-full border border-forest/15 p-1">
              {GROUPS.map((g) => {
                const n = data?.bookings.filter((b) => b.group === g).length ?? 0;
                return (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    aria-selected={tab === g}
                    onClick={() => setTab(g)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === g ? "bg-forest text-linen" : "text-forest hover:text-saffron"}`}
                  >
                    {a.tabs[g]}
                    {data && <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${tab === g ? "bg-linen/20" : "bg-sand"}`}>{n}</span>}
                  </button>
                );
              })}
            </div>
            {data && (() => {
              const list = data.bookings.filter((b) => b.group === tab);
              if (list.length === 0) return <p className="mt-5 text-forest/70">{a.noneIn[tab]}</p>;
              return (
                <ul className="mt-5 divide-y divide-forest/10 rounded-[1.6rem] border border-forest/10 bg-linen">
                  {list.map((b) => {
                    const paid = b.paidWithMembership
                      ? t.booking.status.paidWithMembership
                      : [b.amountCents > 0 || b.giftCents === 0 ? fmtEuro(b.amountCents, lang) : "", b.giftCents > 0 ? a.paidGift(fmtEuro(b.giftCents, lang)) : ""]
                          .filter(Boolean)
                          .join(" + ");
                    return (
                      <li key={b.ref} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{b.title[lang]}</p>
                          <p className="text-sm text-forest/60 first-letter:uppercase">
                            {b.undated ? `${t.agenda.appointment}${b.preferred ? ` · ${b.preferred}` : ""}` : fmtLong(b.startsAt, lang)} · {paid}
                          </p>
                        </div>
                        <Link to={b.manageUrl} className="text-sm font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                          {a.manage}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}

            <h2 className="mt-14 font-display text-3xl font-light text-ink">{a.refunds}</h2>
            {data && data.refunds.length === 0 && <p className="mt-4 text-forest/70">{a.noRefunds}</p>}
            {data && data.refunds.length > 0 && (
              <ul className="mt-5 divide-y divide-forest/10 rounded-[1.6rem] border border-forest/10 bg-linen">
                {data.refunds.map((r) => (
                  <li key={r.kind + r.ref} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{r.title[lang]}</p>
                      <ul className="mt-1 text-sm text-forest/70">
                        {r.toCardCents > 0 && <li>{a.refundToCard(fmtEuro(r.toCardCents, lang))}</li>}
                        {r.toGiftCardCents > 0 && <li>{a.refundToGift(fmtEuro(r.toGiftCardCents, lang))}</li>}
                        {r.creditReturned && <li>{a.refundCredit}</li>}
                      </ul>
                      <p className="mt-1 text-xs text-forest/50">
                        {r.date ? fmtDate(r.date, lang) : ""} · {r.ref}
                      </p>
                    </div>
                    {r.manageUrl && (
                      <Link to={r.manageUrl} className="text-sm font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                        {a.manage}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {data && data.giftCards.length > 0 && (
              <>
                <h2 className="mt-14 font-display text-3xl font-light text-ink">{a.giftCards}</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {data.giftCards.map((g) => (
                    <div key={g.ref} className={`rounded-[1.6rem] border border-forest/10 bg-linen p-5 ${g.status === "active" ? "" : "opacity-60"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-lg font-bold tracking-wider text-ink">{g.code}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[g.status] ?? ""}`}>{a.status[g.status] ?? g.status}</span>
                      </div>
                      <p className="mt-2 font-semibold text-forest">{a.giftLeft(fmtEuro(g.balanceCents, lang), fmtEuro(g.initialCents, lang))}</p>
                      <p className="mt-1 text-sm text-forest/60">
                        {g.role === "received" ? a.giftReceived : `${a.giftBought}${g.recipientName ? ` · ${g.recipientName}` : ""}`}
                        {g.expiresAt ? ` · ${a.validUntil(fmtDate(g.expiresAt, lang))}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <Button to={ROUTES.agenda}>{a.bookNow}</Button>
              <Button to={ROUTES.gift} variant="ghost">
                {t.gift.cta}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
