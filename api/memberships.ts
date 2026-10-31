import { handler, json } from "../server/http.js";
import { listPlansPublic } from "../server/memberships.js";

/** GET /api/memberships -> the membership plans that are on sale. */
export const GET = handler(async () => json({ ok: true, plans: await listPlansPublic() }));
