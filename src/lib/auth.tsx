/**
 * Customer login (Supabase Auth): "Continue with Google" for Gmail users, or a one-time
 * login link by email for everyone else. Supabase is loaded only when needed, so pages
 * that never touch login don't pay for it.
 *
 * Config (build time): VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { api } from "./api";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const authEnabled = Boolean(URL_ && KEY);

let clientPromise: Promise<SupabaseClient> | null = null;
function supabase(): Promise<SupabaseClient> {
  if (!authEnabled) return Promise.reject(new Error("Login is not configured."));
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL_!, KEY!, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  );
  return clientPromise;
}

/** True when the URL looks like a login redirect, so we load Supabase straight away to finish it. */
const returningFromLogin = () => typeof window !== "undefined" && /[?&#](code|access_token|error_description)=/.test(window.location.href);
/** Supabase keeps the session in localStorage under sb-<project>-auth-token. */
const hasStoredSession = () => {
  try {
    return Object.keys(window.localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
  } catch {
    return false;
  }
};

type AuthCtx = {
  enabled: boolean;
  ready: boolean;
  email: string;
  name: string;
  token: string;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signInWithEmail: (email: string, returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Calls our API with the login token attached. */
  authApi: <T = Record<string, unknown>>(path: string, init?: RequestInit) => Promise<T>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!authEnabled);

  useEffect(() => {
    if (!authEnabled) return;
    // Nothing stored and not coming back from a login: don't load Supabase yet.
    if (!hasStoredSession() && !returningFromLogin()) {
      setReady(true);
      return;
    }
    let unsub: (() => void) | undefined;
    supabase()
      .then(async (sb) => {
        const { data } = await sb.auth.getSession();
        setSession(data.session);
        setReady(true);
        unsub = sb.auth.onAuthStateChange((_e, s) => setSession(s)).data.subscription.unsubscribe;
        // Clean the ?code=… from the address bar after the redirect.
        if (returningFromLogin()) {
          const u = new window.URL(window.location.href);
          u.searchParams.delete("code");
          window.history.replaceState(null, "", u.pathname + u.search);
        }
      })
      .catch(() => setReady(true));
    return () => unsub?.();
  }, []);

  const redirect = (returnTo?: string) => `${window.location.origin}${returnTo ?? window.location.pathname + window.location.search}`;

  const signInWithGoogle = useCallback(async (returnTo?: string) => {
    const sb = await supabase();
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect(returnTo) } });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, returnTo?: string) => {
    const sb = await supabase();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect(returnTo), shouldCreateUser: true } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const sb = await supabase();
    await sb.auth.signOut();
    setSession(null);
  }, []);

  const token = session?.access_token ?? "";
  const authApi = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      // Always use a fresh token (supabase-js refreshes it when needed).
      let t = token;
      if (authEnabled && clientPromise) t = (await (await supabase()).auth.getSession()).data.session?.access_token ?? "";
      return api<T>(path, { ...init, headers: { ...(init.headers as Record<string, string>), ...(t ? { Authorization: `Bearer ${t}` } : {}) } });
    },
    [token],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      enabled: authEnabled,
      ready,
      email: session?.user.email ?? "",
      name: (session?.user.user_metadata?.full_name as string) || (session?.user.user_metadata?.name as string) || "",
      token,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      authApi,
    }),
    [ready, session, token, signInWithGoogle, signInWithEmail, signOut, authApi],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
