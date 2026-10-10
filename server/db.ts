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
