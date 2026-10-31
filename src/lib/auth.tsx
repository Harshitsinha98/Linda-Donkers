/**
 * Customer login through Supabase Auth: "Continue with Google" or a one-time email link.
 *
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (the public key, safe in the
 * browser). Without them the site works as before; only login and memberships are off.
 *
 * The access token is sent to our own API as `Authorization: Bearer <token>`; the API
 * checks it with Supabase (server/auth.ts).
 */
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } }) : null;

type AuthCtx = {
  /** false when Supabase isn't configured: hide login, show "coming soon". */
  enabled: boolean;
  ready: boolean;
  session: Session | null;
  email: string;
  name: string;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signInWithEmail: (email: string, returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const redirect = (returnTo?: string) => `${window.location.origin}${returnTo ?? window.location.pathname + window.location.search}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (returnTo?: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect(returnTo) } });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, returnTo?: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect(returnTo), shouldCreateUser: true } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
    return {
      enabled: !!supabase,
      ready,
      session,
      email: session?.user.email ?? "",
      name: meta.full_name || meta.name || "",
      signInWithGoogle,
      signInWithEmail,
      signOut,
    };
  }, [ready, session, signInWithGoogle, signInWithEmail, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Our API with the customer's login token attached (when logged in). */
export async function authApi<T = Record<string, unknown>>(session: Session | null, path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return api<T>(path, { ...init, headers });
}
