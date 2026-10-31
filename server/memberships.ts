/**
 * Memberships: session cards and subscriptions Linda defines herself in the admin panel
 * ("plans"), bought on the website by logged-in customers (Supabase login).
 *
 * A plan has a price, a number of sessions ("credits", 0 = unlimited), a validity in days
 * and a scope: which sessions it can be used for. A bought membership copies the credits
 * and scope at purchase time, so later edits to the plan never change what someone bought.
 */
import { z } from "zod";
import { DEFAULT_PLANS, expandScope, OFFERING_GROUPS, OFFERINGS, PHOTO_KEYS, SECTIONS, sectionOf } from "../shared/catalog.js";
import type { AuthUser } from "./auth.js";
import { all, get, run } from "./db.js";
import { sendMembershipConfirmed } from "./email.js";
import { HttpError, newId, newRef } from "./http.js";
import { evaluateCoupon, releaseCoupon, reserveCoupon } from "./coupons.js";
import { Stripe, stripe, stripeConfigured } from "./stripe.js";
import { formatEuro, nowIso } from "./time.js";
import type { SessionRow } from "./sessions.js";

export type PlanRow = {
  id: string;
  name_nl: string;
  name_en: string;
  description_nl: string;
  description_en: string;
  price_cents: number;
  credits: number;
  validity_days: number;
  scope: string;
  photo: string;
  sort: number;
  status: "active" | "hidden" | "archived";
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  id: string;
  ref: string;
  plan_id: string;
  user_id: string;
  email: string;
  name: string;
  phone: string;
  lang: string;
  credits_total: number;
  credits_used: number;
  scope: string;
  amount_cents: number;
  coupon_code: string;
  discount_cents: number;
  source: "web" | "manual";
  status: "pending" | "active" | "expired" | "cancelled";
  starts_at: string | null;
  expires_at: string | null;
  stripe_checkout_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  activated_at: string | null;
  cancelled_at: string | null;
};

const parseScope = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

/** Valid scope entries: "all", "section:<yoga|massage|online>", an offering group key, or an offering key. */
export const SCOPE_KEYS = [
  "all",
  ...SECTIONS.map((s) => `section:${s}`),
  ...OFFERING_GROUPS.map((g) => g.key),
  ...OFFERINGS.map((o) => o.key),
];

/** Can a membership with this scope be used for this session? */
export function scopeCovers(scope: string[], s: Pick<SessionRow, "offering" | "category" | "is_online">): boolean {
  if (scope.includes("all")) return true;
  const section = sectionOf({ category: s.category, isOnline: !!s.is_online });
  if (scope.includes(`section:${section}`)) return true;
  return !!s.offering && expandScope(scope).has(s.offering);
}

const effectiveStatus = (m: MembershipRow) =>
  m.status === "active" && m.expires_at && Date.parse(m.expires_at) <= Date.now() ? "expired" : m.status;

/* ---------------- plans ---------------- */

export const planInput = z.object({
  nameNl: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(120).default(""),
  descriptionNl: z.string().trim().max(2000).default(""),
  descriptionEn: z.string().trim().max(2000).default(""),
  priceCents: z.number().int().min(0).max(10_000_000),
  credits: z.number().int().min(0).max(1000),
  validityDays: z.number().int().min(1).max(3660),
  scope: z.array(z.enum(SCOPE_KEYS as [string, ...string[]])).min(1, "Choose at least one kind of session."),
  photo: z.union([z.literal(""), z.enum(PHOTO_KEYS)]).default(""),
  sort: z.number().int().min(0).max(1000).default(0),
  status: z.enum(["active", "hidden"]).default("active"),
});
export type PlanInput = z.infer<typeof planInput>;

const planCols = (p: PlanInput) => ({
  name_nl: p.nameNl,
  name_en: p.nameEn,
  description_nl: p.descriptionNl,
  description_en: p.descriptionEn,
  price_cents: p.priceCents,
  credits: p.credits,
  validity_days: p.validityDays,
  scope: JSON.stringify([...new Set(p.scope)]),
  photo: p.photo,
  sort: p.sort,
  status: p.status,
});

export function planPublic(p: PlanRow) {
  return {
    id: p.id,
    name: { nl: p.name_nl, en: p.name_en || p.name_nl },
    description: { nl: p.description_nl, en: p.description_en || p.description_nl },
    priceCents: p.price_cents,
    credits: p.credits,
    validityDays: p.validity_days,
    scope: parseScope(p.scope),
    photo: p.photo,
    status: p.status,
  };
}

export const getPlan = (id: string) => get<PlanRow>(`SELECT * FROM membership_plans WHERE id = ?`, [id]);

export async function listPlansPublic() {
  const rows = await all<PlanRow>(`SELECT * FROM membership_plans WHERE status = 'active' ORDER BY sort ASC, created_at ASC`);
  return rows.map(planPublic);
}

export async function listPlansAdmin() {
  const rows = await all<PlanRow & { sold: number; revenue: number }>(
    `SELECT p.*,
       (SELECT COUNT(*) FROM memberships m WHERE m.plan_id = p.id AND m.status IN ('active','expired')) AS sold,
       COALESCE((SELECT SUM(amount_cents) FROM memberships m WHERE m.plan_id = p.id AND m.status IN ('active','expired')), 0) AS revenue
     FROM membership_plans p WHERE p.status <> 'archived' ORDER BY p.sort ASC, p.created_at ASC`,
  );
  return rows.map((r) => ({ ...planPublic(r), sold: r.sold, revenueCents: r.revenue }));
}

export async function createPlan(p: PlanInput) {
  const c = planCols(p);
  const keys = Object.keys(c);
  const id = newId();
  const now = nowIso();
  await run(`INSERT INTO membership_plans (id, ${keys.join(", ")}, created_at, updated_at) VALUES (?, ${keys.map(() => "?").join(", ")}, ?, ?)`, [
    id, ...Object.values(c), now, now,
  ]);
  return id;
}

export async function updatePlan(id: string, p: PlanInput) {
  if (!(await getPlan(id))) throw new HttpError(404, "not_found");
  const c = planCols(p);
  const keys = Object.keys(c);
  await run(`UPDATE membership_plans SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [...Object.values(c), nowIso(), id]);
}

/** Plans that were sold are archived (hidden for good) so the sold memberships keep their plan. */
export async function deletePlan(id: string) {
  const used = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM memberships WHERE plan_id = ?`, [id]);
  if (used && used.n > 0) {
    await run(`UPDATE membership_plans SET status = 'archived', updated_at = ? WHERE id = ?`, [nowIso(), id]);
    return { archived: true };
  }
  await run(`DELETE FROM membership_plans WHERE id = ?`, [id]);
  return { archived: false };
}

/** Creates Linda's standard session cards when there are no plans yet. */
export async function seedDefaultPlans(): Promise<number> {
  const existing = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM membership_plans WHERE status <> 'archived'`);
  if (existing && existing.n > 0) return 0;
  let i = 0;
  for (const p of DEFAULT_PLANS) await createPlan({ ...p, sort: i++, status: "active" });
  return DEFAULT_PLANS.length;
}

/* ---------------- views ---------------- */

export function membershipView(m: MembershipRow, plan?: PlanRow) {
  const status = effectiveStatus(m);
  return {
    id: m.id,
    ref: m.ref,
    planId: m.plan_id,
    name: plan ? { nl: plan.name_nl, en: plan.name_en || plan.name_nl } : { nl: "Membership", en: "Membership" },
    photo: plan?.photo ?? "",
    holder: m.name,
    email: m.email,
    phone: m.phone,
    creditsTotal: m.credits_total,
    creditsUsed: m.credits_used,
    creditsLeft: m.credits_total === 0 ? null : Math.max(0, m.credits_total - m.credits_used),
    scope: parseScope(m.scope),
    amountCents: m.amount_cents,
    couponCode: m.coupon_code,
    discountCents: m.discount_cents,
    source: m.source,
    status,
    startsAt: m.starts_at,
    expiresAt: m.expires_at,
    createdAt: m.created_at,
    paidOnline: !!m.stripe_payment_intent,
  };
}

/* ---------------- buying ---------------- */

export const purchaseInput = z.object({
  planId: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).default(""),
  lang: z.enum(["nl", "en"]).default("nl"),
  couponCode: z.string().trim().max(40).default(""),
  acceptTerms: z.literal(true),
});

export const getMembership = (id: string) => get<MembershipRow>(`SELECT * FROM memberships WHERE id = ?`, [id]);

export async function startPurchase(user: AuthUser, input: z.infer<typeof purchaseInput>, base: string) {
  const plan = await getPlan(input.planId);
  if (!plan || plan.status !== "active") throw new HttpError(409, "unavailable");

  let amount = plan.price_cents;
  let discount = 0;
  let couponCode = "";
  if (input.couponCode) {
    const r = await evaluateCoupon(input.couponCode, { kind: "membership" }, amount, user.email);
    if (!(await reserveCoupon(r.coupon))) throw new HttpError(400, "coupon_used_up", "This code has been used up.");
    discount = r.discountCents;
    couponCode = r.coupon.code;
    amount -= discount;
  }
  if (amount > 0 && !stripeConfigured()) {
    await releaseCoupon(couponCode);
    throw new HttpError(503, "payments_unavailable");
  }

  const id = newId();
  const ref = newRef().replace(/^LD-/, "LM-");
  await run(
    `INSERT INTO memberships (id, ref, plan_id, user_id, email, name, phone, lang, credits_total, scope, amount_cents,
       coupon_code, discount_cents, source, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', 'pending', ?)`,
    [id, ref, plan.id, user.id, user.email, input.name, input.phone, input.lang, plan.credits, plan.scope, amount, couponCode, discount, nowIso()],
  );

  if (amount === 0) {
    await activateMembership(id, null, base);
    return { ref, free: true };
  }

  try {
    const name = input.lang === "en" && plan.name_en ? plan.name_en : plan.name_nl;
    const cs = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amount,
              product_data: {
                name,
                description: [
                  plan.credits ? `${plan.credits}×` : "",
                  `${plan.validity_days} ${input.lang === "en" ? "days" : "dagen"}`,
                  couponCode ? `${couponCode} −${formatEuro(discount, input.lang)}` : "",
                ].filter(Boolean).join(" · "),
              },
            },
          },
        ],
        customer_email: user.email,
        client_reference_id: id,
        metadata: { kind: "membership", membership_id: id, ref },
        payment_intent_data: { description: `${ref} · ${name}`, metadata: { kind: "membership", membership_id: id, ref } },
        locale: input.lang === "en" ? "en" : "nl",
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${base}/account?membership=${ref}&paid=1`,
        cancel_url: `${base}/lidmaatschap?aborted=1`,
      },
      { idempotencyKey: `membership-${id}` },
    );
    await run(`UPDATE memberships SET stripe_checkout_id = ? WHERE id = ?`, [cs.id, id]);
    if (!cs.url) throw new Error("Stripe returned no checkout URL");
    return { url: cs.url };
  } catch (err) {
    await expirePending(id);
    console.error("[stripe] membership checkout failed", err);
    throw new HttpError(502, "payments_unavailable");
  }
}

/** Marks a membership paid and starts its validity. Idempotent: the email goes out once. */
export async function activateMembership(id: string, paymentIntent: string | null, base: string) {
  const m = await getMembership(id);
  if (!m) return;
  const plan = await getPlan(m.plan_id);
  const days = plan?.validity_days ?? 365;
  const now = new Date();
  const changed = await run(
    `UPDATE memberships SET status = 'active', starts_at = ?, expires_at = ?, activated_at = ?,
       stripe_payment_intent = COALESCE(?, stripe_payment_intent)
     WHERE id = ? AND status IN ('pending','expired') AND activated_at IS NULL`,
    [now.toISOString(), new Date(now.getTime() + days * 86_400_000).toISOString(), now.toISOString(), paymentIntent, id],
  );
  if (!changed) return;
  const updated = (await getMembership(id))!;
  await sendMembershipConfirmed(updated, plan, base);
}

async function expirePending(id: string) {
  const m = await getMembership(id);
  const changed = await run(`UPDATE memberships SET status = 'expired' WHERE id = ? AND status = 'pending'`, [id]);
  if (changed && m?.coupon_code) await releaseCoupon(m.coupon_code);
}

const intentId = (cs: Stripe.Checkout.Session) =>
  typeof cs.payment_intent === "string" ? cs.payment_intent : (cs.payment_intent?.id ?? null);

/** Applies a membership Checkout Session (webhook, or a direct check from the account page). */
export async function applyMembershipCheckout(cs: Stripe.Checkout.Session, base: string) {
  const id = cs.metadata?.membership_id || cs.client_reference_id;
  if (!id) return;
  if (cs.status === "complete" && (cs.payment_status === "paid" || cs.payment_status === "no_payment_required")) {
    await activateMembership(id, intentId(cs), base);
  } else if (cs.status === "expired") {
    await expirePending(id);
  }
}

/* ---------------- customer account ---------------- */

/** Memberships of a logged-in customer: linked to their account, or bought/granted with their email. */
export async function listForUser(user: AuthUser, base: string) {
  // Link memberships Linda granted to this email before the person had an account.
  await run(`UPDATE memberships SET user_id = ? WHERE user_id = '' AND email = ?`, [user.id, user.email]);
  let rows = await all<MembershipRow>(
    `SELECT * FROM memberships WHERE (user_id = ? OR email = ?) AND (activated_at IS NOT NULL OR status = 'pending')
     ORDER BY created_at DESC LIMIT 50`,
    [user.id, user.email],
  );
  // If the webhook hasn't arrived yet, ask Stripe directly about recent pending purchases.
  const pending = rows.filter((m) => m.status === "pending" && m.stripe_checkout_id);
  if (pending.length && stripeConfigured()) {
    // (abandoned checkouts become 'expired' and drop out of the list on the next load)
    for (const m of pending) {
      try {
        await applyMembershipCheckout(await stripe().checkout.sessions.retrieve(m.stripe_checkout_id!), base);
      } catch (err) {
        console.error("[stripe] membership sync failed", err);
      }
    }
    rows = await all<MembershipRow>(`SELECT * FROM memberships WHERE id IN (${rows.map(() => "?").join(",")}) ORDER BY created_at DESC`, rows.map((r) => r.id));
  }
  const plans = new Map<string, PlanRow>();
  for (const m of rows) if (!plans.has(m.plan_id)) { const p = await getPlan(m.plan_id); if (p) plans.set(p.id, p); }
  return rows.filter((m) => !(m.status === "expired" && !m.activated_at)).map((m) => membershipView(m, plans.get(m.plan_id)));
}

/** Memberships of this user that can pay for this session right now. */
export async function usableFor(user: AuthUser, s: SessionRow) {
  const rows = await all<MembershipRow>(
    `SELECT * FROM memberships WHERE (user_id = ? OR email = ?) AND status = 'active' AND expires_at > ?
       AND (credits_total = 0 OR credits_used < credits_total) ORDER BY expires_at ASC`,
    [user.id, user.email, nowIso()],
  );
  return rows.filter((m) => scopeCovers(parseScope(m.scope), s) && (s.booking_mode === "appointment" || s.starts_at <= m.expires_at!));
}

/** Takes one session off the card, atomically. Returns false if nothing is left. */
export async function useCredit(m: MembershipRow): Promise<boolean> {
  const changed = await run(
    `UPDATE memberships SET credits_used = credits_used + 1
     WHERE id = ? AND status = 'active' AND expires_at > ? AND (credits_total = 0 OR credits_used < credits_total)`,
    [m.id, nowIso()],
  );
  return changed > 0;
}

export async function returnCredit(membershipId: string) {
  await run(`UPDATE memberships SET credits_used = credits_used - 1 WHERE id = ? AND credits_used > 0`, [membershipId]);
}

/* ---------------- admin ---------------- */

export async function listSold(filter: "active" | "all") {
  const rows = await all<MembershipRow>(
    `SELECT * FROM memberships WHERE activated_at IS NOT NULL ${filter === "active" ? "AND status = 'active' AND expires_at > ?" : ""}
     ORDER BY created_at DESC LIMIT 500`,
    filter === "active" ? [nowIso()] : [],
  );
  const plans = new Map((await all<PlanRow>(`SELECT * FROM membership_plans`)).map((p) => [p.id, p]));
  return rows.map((m) => membershipView(m, plans.get(m.plan_id)));
}

export const grantInput = z.object({
  planId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).default(""),
  amountCents: z.number().int().min(0).max(10_000_000).default(0),
  lang: z.enum(["nl", "en"]).default("nl"),
  sendEmail: z.boolean().default(true),
});

/** Linda sells a card herself (cash, bank transfer): it becomes active straight away. */
export async function grantMembership(input: z.infer<typeof grantInput>, base: string) {
  const plan = await getPlan(input.planId);
  if (!plan) throw new HttpError(404, "not_found");
  const id = newId();
  const ref = newRef().replace(/^LD-/, "LM-");
  const now = new Date();
  await run(
    `INSERT INTO memberships (id, ref, plan_id, user_id, email, name, phone, lang, credits_total, scope, amount_cents, source, status,
       starts_at, expires_at, created_at, activated_at)
     VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, 'manual', 'active', ?, ?, ?, ?)`,
    [
      id, ref, plan.id, input.email, input.name, input.phone, input.lang, plan.credits, plan.scope, input.amountCents,
      now.toISOString(), new Date(now.getTime() + plan.validity_days * 86_400_000).toISOString(), now.toISOString(), now.toISOString(),
    ],
  );
  if (input.sendEmail) await sendMembershipConfirmed((await getMembership(id))!, plan, base);
  return { ref };
}

export const adjustInput = z.object({
  id: z.string().min(1),
  creditsUsed: z.number().int().min(0).max(1000),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Linda corrects a card by hand, e.g. a session used offline or an extension. */
export async function adjustMembership(input: z.infer<typeof adjustInput>) {
  const m = await getMembership(input.id);
  if (!m || m.status === "pending") throw new HttpError(404, "not_found");
  if (m.credits_total && input.creditsUsed > m.credits_total) throw new HttpError(400, "too_many", `This card has ${m.credits_total} sessions.`);
  const expires = new Date(`${input.expiresAt}T23:59:59Z`).toISOString();
  await run(
    `UPDATE memberships SET credits_used = ?, expires_at = ? WHERE id = ?`,
    [input.creditsUsed, expires, m.id],
  );
}

/** Cancels a membership; optionally refunds the online payment in full. */
export async function cancelMembership(id: string, refund: boolean) {
  const m = await getMembership(id);
  if (!m || m.status !== "active") throw new HttpError(409, "not_cancellable", "Only active memberships can be cancelled.");
  let refunded = 0;
  if (refund && m.stripe_payment_intent && m.amount_cents > 0) {
    try {
      await stripe().refunds.create({ payment_intent: m.stripe_payment_intent, metadata: { membership_id: m.id, ref: m.ref } }, { idempotencyKey: `mrefund-${m.id}` });
      refunded = m.amount_cents;
    } catch (err) {
      throw new HttpError(502, "refund_failed", `Stripe refund failed: ${(err as Error).message}`);
    }
  }
  await run(`UPDATE memberships SET status = 'cancelled', cancelled_at = ? WHERE id = ?`, [nowIso(), m.id]);
  return { refundedCents: refunded };
}
