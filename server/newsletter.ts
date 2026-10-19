/**
 * Newsletter subscribers.
 *
 * Stores people who want to hear about upcoming events and workshops. Signing up
 * is idempotent: the same email can submit again without creating a duplicate, and
 * a previously unsubscribed address is simply reactivated.
 *
 * Linda can later send campaigns from here (e.g. by exporting the list or by
 * connecting a dedicated email provider). The confirmation + notification emails
 * reuse the existing Resend setup.
 */
import { all, get, run } from "./db.js";
import { newId } from "./http.js";
import { sendNewsletterWelcome } from "./email.js";

export type SubscriberRow = {
  id: string;
  email: string;
  lang: string;
  source: string;
  status: "subscribed" | "unsubscribed";
  created_at: string;
  unsubscribed_at: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Subscribe an email. Returns whether this was a brand-new subscriber. */
export async function subscribe(
  rawEmail: string,
  lang: string,
  base: string,
  source = "website",
): Promise<{ created: boolean }> {
  const email = normalizeEmail(rawEmail);
  const existing = await get<SubscriberRow>("SELECT * FROM subscribers WHERE email = ?", [email]);

  if (existing) {
    if (existing.status === "unsubscribed") {
      await run("UPDATE subscribers SET status = 'subscribed', unsubscribed_at = NULL, lang = ? WHERE id = ?", [lang, existing.id]);
      // Reactivation: welcome them back once more.
      void sendNewsletterWelcome(email, lang, base).catch(() => {});
      return { created: false };
    }
    // Already on the list; stay quiet and idempotent (no duplicate email).
    return { created: false };
  }

  const now = new Date().toISOString();
  await run(
    "INSERT INTO subscribers (id, email, lang, source, status, created_at) VALUES (?, ?, ?, ?, 'subscribed', ?)",
    [newId(), email, lang, source, now],
  );
  void sendNewsletterWelcome(email, lang, base).catch(() => {});
  return { created: true };
}

export async function unsubscribe(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  await run("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE email = ?", [new Date().toISOString(), email]);
}

export async function listSubscribers(status: "subscribed" | "unsubscribed" | "all" = "subscribed"): Promise<SubscriberRow[]> {
  if (status === "all") return all<SubscriberRow>("SELECT * FROM subscribers ORDER BY created_at DESC");
  return all<SubscriberRow>("SELECT * FROM subscribers WHERE status = ? ORDER BY created_at DESC", [status]);
}
