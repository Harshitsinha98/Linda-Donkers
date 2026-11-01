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
     id                 TEXT PRIMARY KEY,
     code               TEXT NOT NULL UNIQUE,
     description        TEXT NOT NULL DEFAULT '',
     kind               TEXT NOT NULL,
     value              INTEGER NOT NULL,
     applies_to         TEXT NOT NULL DEFAULT 'all',
     min_amount_cents   INTEGER NOT NULL DEFAULT 0,
     max_uses           INTEGER NOT NULL DEFAULT 0,
     max_uses_per_email INTEGER NOT NULL DEFAULT 1,
     used_count         INTEGER NOT NULL DEFAULT 0,
     valid_from         TEXT NOT NULL DEFAULT '',
     valid_until        TEXT NOT NULL DEFAULT '',
     active             INTEGER NOT NULL DEFAULT 1,
     created_at         TEXT NOT NULL,
     updated_at         TEXT NOT NULL,
     CHECK (kind IN ('percent','fixed')),
     CHECK (value >= 1),
     CHECK (used_count >= 0)
   )`,
  `CREATE TABLE IF NOT EXISTS membership_plans (
     id              TEXT PRIMARY KEY,
     name_nl         TEXT NOT NULL,
     name_en         TEXT NOT NULL DEFAULT '',
     description_nl  TEXT NOT NULL DEFAULT '',
     description_en  TEXT NOT NULL DEFAULT '',
     price_cents     INTEGER NOT NULL,
     credits         INTEGER NOT NULL DEFAULT 0,
     validity_days   INTEGER NOT NULL,
     scope           TEXT NOT NULL DEFAULT '[]',
     photo           TEXT NOT NULL DEFAULT '',
     sort            INTEGER NOT NULL DEFAULT 0,
     status          TEXT NOT NULL DEFAULT 'active',
     created_at      TEXT NOT NULL,
     updated_at      TEXT NOT NULL,
     CHECK (price_cents >= 0),
     CHECK (credits >= 0),
     CHECK (validity_days >= 1),
     CHECK (status IN ('active','hidden','archived'))
   )`,
  `CREATE TABLE IF NOT EXISTS memberships (
     id                    TEXT PRIMARY KEY,
     ref                   TEXT NOT NULL UNIQUE,
     plan_id               TEXT NOT NULL REFERENCES membership_plans(id),
     user_id               TEXT NOT NULL DEFAULT '',
     email                 TEXT NOT NULL,
     name                  TEXT NOT NULL,
     phone                 TEXT NOT NULL DEFAULT '',
     lang                  TEXT NOT NULL DEFAULT 'nl',
     credits_total         INTEGER NOT NULL,
     credits_used          INTEGER NOT NULL DEFAULT 0,
     scope                 TEXT NOT NULL DEFAULT '[]',
     amount_cents          INTEGER NOT NULL,
     coupon_code           TEXT NOT NULL DEFAULT '',
     discount_cents        INTEGER NOT NULL DEFAULT 0,
     source                TEXT NOT NULL DEFAULT 'web',
     status                TEXT NOT NULL,
     starts_at             TEXT,
     expires_at            TEXT,
     stripe_checkout_id    TEXT,
     stripe_payment_intent TEXT,
     created_at            TEXT NOT NULL,
     activated_at          TEXT,
     cancelled_at          TEXT,
     CHECK (credits_used >= 0),
     CHECK (status IN ('pending','active','expired','cancelled'))
   )`,
  `CREATE INDEX IF NOT EXISTS memberships_user ON memberships (user_id, status)`,
  `CREATE INDEX IF NOT EXISTS memberships_email ON memberships (email, status)`,
  `CREATE INDEX IF NOT EXISTS memberships_checkout ON memberships (stripe_checkout_id)`,
  `CREATE TABLE IF NOT EXISTS gift_cards (
     id                    TEXT PRIMARY KEY,
     ref                   TEXT NOT NULL UNIQUE,
     token                 TEXT NOT NULL,
     code                  TEXT NOT NULL UNIQUE,
     code_key              TEXT NOT NULL UNIQUE,
     initial_cents         INTEGER NOT NULL,
     balance_cents         INTEGER NOT NULL DEFAULT 0,
     buyer_name            TEXT NOT NULL DEFAULT '',
     buyer_email           TEXT NOT NULL DEFAULT '',
     recipient_name        TEXT NOT NULL DEFAULT '',
     recipient_email       TEXT NOT NULL DEFAULT '',
     message               TEXT NOT NULL DEFAULT '',
     lang                  TEXT NOT NULL DEFAULT 'nl',
     source                TEXT NOT NULL DEFAULT 'web',
     status                TEXT NOT NULL,
     expires_at            TEXT,
     amount_paid_cents     INTEGER NOT NULL DEFAULT 0,
     refunded_cents        INTEGER NOT NULL DEFAULT 0,
     stripe_checkout_id    TEXT,
     stripe_payment_intent TEXT,
     created_at            TEXT NOT NULL,
     activated_at          TEXT,
     cancelled_at          TEXT,
     CHECK (initial_cents >= 1),
     CHECK (balance_cents >= 0),
     CHECK (status IN ('pending','active','expired','cancelled'))
   )`,
  `CREATE INDEX IF NOT EXISTS gift_cards_buyer ON gift_cards (buyer_email)`,
  `CREATE INDEX IF NOT EXISTS gift_cards_recipient ON gift_cards (recipient_email)`,
  `CREATE INDEX IF NOT EXISTS gift_cards_checkout ON gift_cards (stripe_checkout_id)`,
  `CREATE TABLE IF NOT EXISTS gift_card_ledger (
     id             TEXT PRIMARY KEY,
     gift_card_id   TEXT NOT NULL REFERENCES gift_cards(id),
     kind           TEXT NOT NULL,
     amount_cents   INTEGER NOT NULL,
     balance_after  INTEGER NOT NULL,
     booking_id     TEXT,
     membership_id  TEXT,
     note           TEXT NOT NULL DEFAULT '',
     created_at     TEXT NOT NULL,
     CHECK (kind IN ('purchase','redeem','release','refund','adjust','cancel'))
   )`,
  `CREATE INDEX IF NOT EXISTS gift_card_ledger_card ON gift_card_ledger (gift_card_id, created_at)`,
];

/** Columns added after the first release. ALTER fails harmlessly when the column already exists. */
const MIGRATIONS = [
  `ALTER TABLE sessions ADD COLUMN image TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN image_key TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN offering TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN booking_mode TEXT NOT NULL DEFAULT 'scheduled'`,
  `ALTER TABLE bookings ADD COLUMN coupon_code TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN membership_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN preferred TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN availability_rule TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN appointment_start_at TEXT`,
  `ALTER TABLE bookings ADD COLUMN appointment_end_at TEXT`,
  // Gift cards: part of the price paid from a gift card balance (amount_cents stays the Stripe part).
  `ALTER TABLE bookings ADD COLUMN gift_card_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN gift_cents INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE bookings ADD COLUMN gift_refunded_cents INTEGER NOT NULL DEFAULT 0`,
  // 1 when a class-card session went back on the card after a cancellation.
  `ALTER TABLE bookings ADD COLUMN credit_returned INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE memberships ADD COLUMN gift_card_id TEXT`,
  `ALTER TABLE memberships ADD COLUMN gift_cents INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE memberships ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE memberships ADD COLUMN gift_refunded_cents INTEGER NOT NULL DEFAULT 0`,
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

/** Runs several statements in one transaction (all or nothing). */
export async function batch(statements: { sql: string; args?: InValue[] }[]): Promise<void> {
  await (await client()).batch(statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })), "write");
}

export async function run(sql: string, args: InValue[] = []): Promise<number> {
  const res = await (await client()).execute({ sql, args });
  return res.rowsAffected;
}
