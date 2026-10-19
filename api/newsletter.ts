import { z } from "zod";
import { clientIp, handler, json, rateLimit, readBody, siteUrl } from "../server/http.js";
import { subscribe } from "../server/newsletter.js";

const body = z.object({
  email: z.string().email().max(200),
  lang: z.enum(["nl", "en"]).default("nl"),
  // Honeypot: real users leave this empty; bots tend to fill every field.
  company: z.string().max(0).optional(),
});

/** POST /api/newsletter { email, lang } -> subscribe to the newsletter. */
export const POST = handler(async (req) => {
  rateLimit(`newsletter:${clientIp(req)}`, 10, 10 * 60_000);
  const input = await readBody(req, body);
  await subscribe(input.email, input.lang, siteUrl(req));
  // Always report success so the response never reveals whether an email was already on the list.
  return json({ ok: true });
});
