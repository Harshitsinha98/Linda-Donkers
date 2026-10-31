/**
 * Storage for sessions and bookings.
 *
 * Production (Vercel): Turso / libSQL over HTTP. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
 * Local development: a SQLite file at ./data/linda.db (no setup needed).
 *
 * Every write that matters for capacity is a single atomic statement, so two people
 * booking the last place at the same moment can never both get it.
 */
import type { Client, InValue } from "@libsql/client";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sessions (
     id              TEXT PRIMARY KEY,
     title_nl        TEXT NOT NULL,
     title_en        TEXT NOT NULL DEFAULT '',
     description_nl  TEXT NOT NULL DEFAULT '',
     description_en  TEXT NOT NULL DEFAULT '',
     category        TEXT NOT NULL,
     venue           TEXT NOT NULL DEFAULT '',
     address         TEXT NOT NULL DEFAULT '',
     is_online       INTEGER NOT NULL DEFAULT 0,
     online_link     TEXT NOT NULL DEFAULT '',
     date            TEXT NOT NULL,
     start_time      TEXT NOT NULL,
     starts_at       TEXT NOT NULL,
     duration_min    INTEGER NOT NULL,
     capacity        INTEGER NOT NULL,
     price_cents     INTEGER NOT NULL,
     max_per_booking INTEGER NOT NULL DEFAULT 1,
     image           TEXT NOT NULL DEFAULT '',
     status          TEXT NOT NULL DEFAULT 'published',
     created_at      TEXT NOT NULL,
     updated_at      TEXT NOT NULL,
     CHECK (capacity >= 1),
     CHECK (price_cents >= 0),
     CHECK (duration_min >= 1),
     CHECK (max_per_booking >= 1),
     CHECK (status IN ('draft','published','cancelled'))
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_start ON sessions (status, starts_at)`,
  `CREATE TABLE IF NOT EXISTS bookings (
     id                    TEXT PRIMARY KEY,
     ref                   TEXT NOT NULL UNIQUE,
     token                 TEXT NOT NULL,
     session_id            TEXT NOT NULL REFERENCES sessions(id),
     name                  TEXT NOT NULL,
     email                 TEXT NOT NULL,
     phone                 TEXT NOT NULL DEFAULT '',
     note                  TEXT NOT NULL DEFAULT '',
     seats                 INTEGER NOT NULL,
     amount_cents          INTEGER NOT NULL,
     refunded_cents        INTEGER NOT NULL DEFAULT 0,
     lang                  TEXT NOT NULL DEFAULT 'nl',
     source                TEXT NOT NULL DEFAULT 'web',
     status                TEXT NOT NULL,
     hold_until            TEXT,
     stripe_checkout_id    TEXT,
     stripe_payment_intent TEXT,
     created_at            TEXT NOT NULL,
     confirmed_at          TEXT,
     cancelled_at          TEXT,
     cancelled_by          TEXT,
     CHECK (seats >= 1),
     CHECK (amount_cents >= 0),
     CHECK (status IN ('pending','confirmed','cancelled','expired')),
     CHECK (source IN ('web','manual'))
   )`,
  `CREATE INDEX IF NOT EXISTS bookings_session ON bookings (session_id, status)`,
  `CREATE INDEX IF NOT EXISTS bookings_checkout ON bookings (stripe_checkout_id)`,
  `CREATE TABLE IF NOT EXISTS subscribers (
     id            TEXT PRIMARY KEY,
     email         TEXT NOT NULL UNIQUE,
     lang          TEXT NOT NULL DEFAULT 'nl',
     source        TEXT NOT NULL DEFAULT 'website',
     status        TEXT NOT NULL DEFAULT 'subscribed',
     created_at    TEXT NOT NULL,
     unsubscribed_at TEXT,
     CHECK (status IN ('subscribed','unsubscribed'))
   )`,
  `CREATE INDEX IF NOT EXISTS subscribers_status ON subscribers (status)`,
  `CREATE TABLE IF NOT EXISTS coupons (
     id               TEXT PRIMARY KEY,
     code             TEXT NOT NULL UNIQUE,
     description      TEXT NOT NULL DEFAULT '',
     kind             TEXT NOT NULL,
     value            INTEGER NOT NULL,
     applies_to       TEXT NOT NULL DEFAULT 'all',
     offers           TEXT NOT NULL DEFAULT '[]',
     max_uses         INTEGER,
     once_per_email   INTEGER NOT NULL DEFAULT 0,
     valid_from       TEXT,
     valid_until      TEXT,
     active           INTEGER NOT NULL DEFAULT 1,
     created_at       TEXT NOT NULL,
     updated_at       TEXT NOT NULL,
     CHECK (kind IN ('percent','amount')),
     CHECK (value >= 1),
     CHECK (applies_to IN ('all','sessions','memberships'))
   )`,
  `CREATE TABLE IF NOT EXISTS membership_plans (
     id              TEXT PRIMARY KEY,
     name_nl         TEXT NOT NULL,
     name_en         TEXT NOT NULL DEFAULT '',
     description_nl  TEXT NOT NULL DEFAULT '',
     description_en  TEXT NOT NULL DEFAULT '',
     price_cents     INTEGER NOT NULL,
     credits         INTEGER NOT NULL,
     validity_days   INTEGER NOT NULL,
     offers          TEXT NOT NULL DEFAULT '[]',
     cover           TEXT NOT NULL DEFAULT '',
     active          INTEGER NOT NULL DEFAULT 1,
     sort            INTEGER NOT NULL DEFAULT 0,
     created_at      TEXT NOT NULL,
     updated_at      TEXT NOT NULL,
     CHECK (price_cents >= 0),
     CHECK (credits >= 1),
     CHECK (validity_days >= 1)
   )`,
  `CREATE TABLE IF NOT EXISTS member_passes (
     id                    TEXT PRIMARY KEY,
     code                  TEXT NOT NULL UNIQUE,
     plan_id               TEXT,
     name_nl               TEXT NOT NULL,
     name_en               TEXT NOT NULL DEFAULT '',
     user_id               TEXT,
     email                 TEXT NOT NULL,
     buyer_name            TEXT NOT NULL DEFAULT '',
     credits_total         INTEGER NOT NULL,
     credits_used          INTEGER NOT NULL DEFAULT 0,
     offers                TEXT NOT NULL DEFAULT '[]',
     validity_days         INTEGER NOT NULL,
     valid_until           TEXT,
     amount_cents          INTEGER NOT NULL DEFAULT 0,
     discount_cents        INTEGER NOT NULL DEFAULT 0,
     coupon_id             TEXT,
     lang                  TEXT NOT NULL DEFAULT 'nl',
     source                TEXT NOT NULL DEFAULT 'web',
     status                TEXT NOT NULL,
     hold_until            TEXT,
     stripe_checkout_id    TEXT,
     stripe_payment_intent TEXT,
     note                  TEXT NOT NULL DEFAULT '',
     created_at            TEXT NOT NULL,
     activated_at          TEXT,
     CHECK (credits_used >= 0 AND credits_used <= credits_total),
     CHECK (status IN ('pending','active','cancelled','expired')),
     CHECK (source IN ('web','manual'))
   )`,
  `CREATE INDEX IF NOT EXISTS passes_email ON member_passes (email, status)`,
  `CREATE INDEX IF NOT EXISTS passes_user ON member_passes (user_id, status)`,
  `CREATE INDEX IF NOT EXISTS passes_checkout ON member_passes (stripe_checkout_id)`,
];

/** Columns added after the first release. ALTER TABLE fails harmlessly when a column already exists. */
const MIGRATIONS = [
  `ALTER TABLE sessions ADD COLUMN image TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN offer TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN cover TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN user_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN coupon_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN pass_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN credits_used INTEGER NOT NULL DEFAULT 0`,
];
const LATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS bookings_coupon ON bookings (coupon_id, status)`,
  `CREATE INDEX IF NOT EXISTS bookings_pass ON bookings (pass_id)`,
  `CREATE INDEX IF NOT EXISTS bookings_email ON bookings (email)`,
];

const g = globalThis as unknown as { __ldDb?: Promise<Client> };

async function open(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./data/linda.db";
  let client: Client;
  if (url.startsWith("file:")) {
    if (process.env.VERCEL) {
      throw new Error("TURSO_DATABASE_URL is not set. A local SQLite file cannot be used on Vercel.");
    }
    const fs = await import("node:fs");
    fs.mkdirSync("./data", { recursive: true });
    const { createClient } = await import("@libsql/client");
    client = createClient({ url, intMode: "number" });
  } else {
    // The /web entry is pure HTTP, no native addon, so it bundles cleanly for serverless.
    const { createClient } = await import("@libsql/client/web");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN, intMode: "number" });
  }
  for (const statement of SCHEMA) await client.execute(statement);
  for (const statement of MIGRATIONS) {
    try {
      await client.execute(statement);
    } catch {
      /* column already exists */
    }
  }
  for (const statement of LATE_INDEXES) await client.execute(statement);
  return client;
}

function client(): Promise<Client> {
  if (!g.__ldDb) {
    g.__ldDb = open().catch((err) => {
      g.__ldDb = undefined; // retry on the next request
      throw err;
    });
  }
  return g.__ldDb;
}

export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const res = await (await client()).execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function get<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: InValue[] = []): Promise<number> {
  const res = await (await client()).execute({ sql, args });
  return res.rowsAffected;
}
