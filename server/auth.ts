/**
 * Customer login through Supabase Auth (Google / Gmail, or an email magic link).
 *
 * The browser signs in with supabase-js and sends the access token as
 * `Authorization: Bearer <token>`. We ask Supabase who that token belongs to, so this
 * works with both the legacy shared JWT secret and the newer asymmetric signing keys.
 * Supabase is only used for identity: all business data stays in our own database.
 */
import { HttpError } from "./http.js";

export type AuthUser = { id: string; email: string; name: string };

const env = () => ({
  url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, ""),
  key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
});

export const authConfigured = () => {
  const { url, key } = env();
  return Boolean(url && key);
};

/** Short per-instance cache so a page that makes a few API calls checks the token only once. */
const cache = new Map<string, { user: AuthUser; until: number }>();

export async function getUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  if (!authConfigured()) throw new HttpError(503, "auth_not_configured", "Login is not configured yet (SUPABASE_URL / SUPABASE_ANON_KEY).");

  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;

  const { url, key } = env();
  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.error("[auth] Supabase unreachable", err);
    throw new HttpError(503, "auth_unavailable", "Login service is unreachable.");
  }
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    console.error("[auth] Supabase", res.status, await res.text());
    throw new HttpError(503, "auth_unavailable", "Login service error.");
  }
  const data = (await res.json()) as {
    id?: string;
    email?: string;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
    user_metadata?: { full_name?: string; name?: string };
  };
  // Only trust verified email addresses: memberships are linked to them.
  if (!data.id || !data.email || !(data.email_confirmed_at || data.confirmed_at)) return null;
  const user: AuthUser = {
    id: data.id,
    email: data.email.trim().toLowerCase(),
    name: data.user_metadata?.full_name || data.user_metadata?.name || "",
  };
  if (cache.size > 500) cache.clear();
  cache.set(token, { user, until: Date.now() + 60_000 });
  return user;
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "login_required", "Please log in.");
  return user;
}
