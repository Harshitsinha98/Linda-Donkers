/**
 * Customer accounts through Supabase Auth (Google sign-in or an email link).
 *
 * The browser signs in with supabase-js and sends its access token as
 * `Authorization: Bearer <token>`. We verify it by asking Supabase who it belongs
 * to (GET /auth/v1/user). That works with both the new asymmetric signing keys and
 * legacy JWT secrets, and needs only the public (publishable/anon) key, never a secret.
 *
 * Supabase is only used for identity. Memberships and bookings stay in our own database,
 * linked to the Supabase user id and the (verified) email address.
 */
import { HttpError } from "./http.js";

export type AuthUser = { id: string; email: string; name: string };

const env = () => ({
  url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, ""),
  key: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
});

export const authConfigured = () => {
  const { url, key } = env();
  return Boolean(url && key);
};

// Short cache so one page load with several API calls only checks the token once.
const cache = new Map<string, { user: AuthUser; until: number }>();

/** The signed-in customer, or null when there's no (valid) token. */
export async function getUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token || token.length > 4096) return null;

  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;

  const { url, key } = env();
  if (!url || !key) return null;

  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.error("[auth] Supabase unreachable", err);
    throw new HttpError(503, "auth_unavailable", "Login is temporarily unavailable.");
  }
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    console.error(`[auth] Supabase ${res.status}: ${await res.text()}`);
    throw new HttpError(503, "auth_unavailable", "Login is temporarily unavailable.");
  }

  const u = (await res.json()) as {
    id?: string;
    email?: string;
    email_confirmed_at?: string | null;
    user_metadata?: { full_name?: string; name?: string };
  };
  // Memberships are matched on email, so only trust confirmed addresses (Google and email links always are).
  if (!u.id || !u.email || !u.email_confirmed_at) return null;

  const user: AuthUser = {
    id: u.id,
    email: u.email.trim().toLowerCase(),
    name: (u.user_metadata?.full_name || u.user_metadata?.name || "").trim(),
  };
  cache.set(token, { user, until: Date.now() + 60_000 });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return user;
}

export async function requireUser(req: Request): Promise<AuthUser> {
  if (!authConfigured()) throw new HttpError(503, "auth_not_configured", "Login is not set up yet.");
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "login_required", "Please log in first.");
  return user;
}
