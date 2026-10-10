import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES, waLink } from "../data/site";
import { api, fmtEuro, fmtLong, type BookingView } from "../lib/api";
import { WhatsAppIcon } from "../components/MobileBar";
import { Button } from "../components/Magnetic";
import { usePageTitle } from "../components/usePageTitle";

const MAX_POLLS = 24;

export default function BookingStatus() {
  const { ref = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const aborted = params.get("aborted") === "1";
  const { t, lang } = useLang();
  const st = t.booking.status;
  usePageTitle(t.meta.booking);

  const [b, setB] = useState<BookingView | null>(null);
  const [missing, setMissing] = useState(false);
  const [polls, setPolls] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  // First load. Coming back from Stripe without paying releases the place right away.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const req = aborted
      ? api<{ booking: BookingView }>("/api/booking", { method: "POST", body: JSON.stringify({ ref, t: token, action: "abandon" }) })
      : api<{ booking: BookingView }>(`/api/booking?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(token)}`);
    req.then((d) => setB(d.booking)).catch(() => setMissing(true));
  }, [ref, token, aborted]);

  // While Stripe confirms the payment, check again every 2.5 seconds.
  useEffect(() => {
    if (b?.status !== "pending" || polls >= MAX_POLLS) return;
    const id = window.setTimeout(async () => {
      try {
        const d = await api<{ booking: BookingView }>(`/api/booking?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(token)}`);
        setB(d.booking);
      } catch {
        /* keep polling */
      }
      setPolls((p) => p + 1);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [b, polls, ref, token]);

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ booking: BookingView }>("/api/booking", { method: "POST", body: JSON.stringify({ ref, t: token, action: "cancel" }) });
      setB(d.booking);
      setConfirming(false);
    } catch {
      setError(t.booking.errors.generic);
    }
    setBusy(false);
  };

  const s = b?.session;
  const when = s ? fmtLong(s.startsAt, lang) : "";
  const where = s ? (s.isOnline ? t.agenda.online : [s.venue, s.address].filter(Boolean).join(", ")) : "";

  return (
    <section className="pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="container-x max-w-3xl">
        {missing ? (
          <Message title={st.notFound} />
        ) : !b || !s ? (
          <p className="text-forest/60" role="status">
            {st.loading}
          </p>
        ) : b.status === "pending" ? (
          <div className="text-center" role="status" aria-live="polite">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-2 border-sand border-t-saffron" />
            <h1 className="mt-10 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-light text-ink">{st.pendingTitle}</h1>
            <p className="lead mx-auto mt-5 max-w-lg">{polls > 6 ? st.pendingSlow : st.pendingText}</p>
          </div>
        ) : b.status === "expired" ? (
          <Message title={st.expiredTitle} text={st.expiredText}>
            <Button to={`${ROUTES.agenda}/${s.id}`}>{st.tryAgain}</Button>
          </Message>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl text-linen ${b.status === "confirmed" ? "bg-sage" : "bg-forest/40"}`} aria-hidden>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {b.status === "confirmed" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
                </svg>
              </span>
              <h1 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-tight text-ink">
                {b.status === "confirmed" ? st.confirmedTitle : st.cancelledTitle}
              </h1>
            </div>
            <p className="lead mt-6">
              {b.status === "confirmed"
                ? st.confirmedText(b.email)
                : st.cancelledText(b.refundedCents > 0 ? fmtEuro(b.refundedCents, lang) : null)}
            </p>

            <div className="mt-10 rounded-[2rem] bg-linen p-7 sm:p-9">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{st.details}</p>
              <h2 className="mt-3 font-display text-3xl font-light text-ink">{s.title[lang]}</h2>
              <dl className="mt-6 grid gap-4 text-[0.98rem] sm:grid-cols-2">
                <Item label={st.when} value={<span className="inline-block first-letter:uppercase">{when}</span>} />
                <Item label={st.where} value={where || "-"} />
                <Item label={st.seats} value={String(b.seats)} />
                <Item label={st.reference} value={<strong>{b.ref}</strong>} />
                {b.amountCents > 0 && <Item label={st.paid} value={fmtEuro(b.amountCents, lang)} />}
                {b.refundedCents > 0 && <Item label={st.refunded} value={fmtEuro(b.refundedCents, lang)} />}
                {b.onlineLink && (
                  <Item
                    label={st.onlineLink}
                    value={
                      <a href={b.onlineLink} target="_blank" rel="noreferrer" className="break-all text-saffron underline">
                        {b.onlineLink}
                      </a>
                    }
                  />
                )}
              </dl>
            </div>

            {b.status === "confirmed" && (
              <>
                <div className="mt-8 rounded-[2rem] bg-[#e7f3e4] p-7 sm:p-9">
                  <h2 className="font-display text-2xl text-ink">{st.shareTitle}</h2>
                  <p className="mt-3 text-forest/80">{st.shareText}</p>
                  <a
                    href={waLink(st.waMessage({ name: b.name, session: s.title[lang], when, seats: b.seats, ref: b.ref }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#25a244] px-7 py-4 text-[0.85rem] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1d8538]"
                  >
                    <WhatsAppIcon /> {st.shareBtn}
                  </a>
                </div>

                {b.cancel.allowed && (
                  <div className="mt-8 rounded-[2rem] border border-forest/10 p-7 sm:p-9">
                    <h2 className="font-display text-2xl text-ink">{st.cancelTitle}</h2>
                    <p className="mt-3 text-forest/75">{st.cancelInfo(b.cancel.percent, fmtEuro(b.cancel.cents, lang))}</p>
                    {error && <p className="mt-4 text-sm text-[#a2470b]">{error}</p>}
                    {!confirming ? (
                      <button type="button" onClick={() => setConfirming(true)} className="mt-6 text-sm font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                        {st.cancelBtn}
                      </button>
                    ) : (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-ink">{st.cancelConfirm}</span>
                        <button type="button" disabled={busy} onClick={cancel} className="rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-linen disabled:opacity-60">
                          {busy ? t.booking.sending : st.cancelYes}
                        </button>
                        <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-forest/20 px-5 py-2.5 text-sm font-bold text-forest">
                          {st.cancelNo}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="mt-10">
              <Link to={ROUTES.agenda} className="font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                {st.agenda}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-sage">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

function Message({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  const { t } = useLang();
  return (
    <div>
      <h1 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-tight text-ink">{title}</h1>
      {text && <p className="lead mt-5">{text}</p>}
      <div className="mt-10 flex flex-wrap gap-4">
        {children}
        <Button to={ROUTES.agenda} variant="ghost">
          {t.booking.status.agenda}
        </Button>
      </div>
    </div>
  );
}
