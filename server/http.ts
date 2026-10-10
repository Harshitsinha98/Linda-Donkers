import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Wraps a handler so thrown HttpErrors become JSON and anything else becomes a logged 500. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ ok: false, error: err.code, message: err.message }, err.status);
      console.error("[api]", err);
      return json({ ok: false, error: "server_error" }, 500);
    }
  };
}

export async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new HttpError(400, "invalid_input", `${first?.path.join(".") || "body"}: ${first?.message}`);
  }
  return parsed.data;
}

export const query = (req: Request) => new URL(req.url).searchParams;

/* ---------- ids & tokens ---------- */

export const newId = () => randomBytes(12).toString("base64url");
export const newToken = () => randomBytes(24).toString("base64url");

/** Short human-friendly reference, e.g. LD-7K3F9Q (no 0/O/1/I). */
export function newRef(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `LD-${out}`;
}

const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
export const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/* ---------- rate limiting (per instance, enough to stop naive scripts) ---------- */

const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) throw new HttpError(429, "rate_limited", "Too many requests.");
}

/* ---------- admin auth ---------- */

/** Linda's admin panel uses one passcode (ADMIN_PASSCODE), sent as the x-admin-passcode header. */
export function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected || expected.length < 8) {
    throw new HttpError(503, "admin_not_configured", "Set ADMIN_PASSCODE (at least 8 characters).");
  }
  const supplied = req.headers.get("x-admin-passcode") ?? "";
  if (!supplied || !safeEqual(supplied, expected)) {
    rateLimit(`admin-fail:${clientIp(req)}`, 10, 15 * 60_000);
    throw new HttpError(401, "unauthorized", "Incorrect passcode.");
  }
}

/** Public base URL used in emails and Stripe redirects. */
export function siteUrl(req: Request): string {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(req.url).origin;
}
