// Database connection.
// - Production / Vercel: set DATABASE_URL to any PostgreSQL database (e.g. Neon free tier).
// - Local development with no DATABASE_URL: an embedded PostgreSQL (PGlite) is created in ./.pglite
//   automatically, so the project runs with zero setup.
// Migrations and demo seed data are applied automatically on first use (ensureDb).
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations";
import { seedDatabase } from "./seed";

export type DB = NodePgDatabase<typeof schema>;

type GlobalWithDb = typeof globalThis & { __kdwcDb?: Promise<DB> };
const g = globalThis as GlobalWithDb;

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    const pool = new Pool({
      connectionString: url,
      max: process.env.VERCEL ? 3 : 10,
      ssl: isLocal || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: false },
    });
    return drizzle(pool, { schema });
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add a PostgreSQL connection string (e.g. Neon) in Vercel → Settings → Environment Variables.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(process.env.PGLITE_DIR ?? "./.pglite");
  return drizzle(client, { schema }) as unknown as DB;
}

/** Apply embedded migrations that have not run yet. */
async function migrate(db: DB) {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "_kdwc_migrations" ("name" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())`);
  const applied = await db.execute<{ name: string }>(sql`SELECT name FROM "_kdwc_migrations"`);
  const done = new Set(applied.rows.map((r) => r.name));
  for (const m of MIGRATIONS) {
    if (done.has(m.name)) continue;
    await db.transaction(async (tx) => {
      for (const stmt of m.sql.split("--> statement-breakpoint")) {
        if (stmt.trim()) await tx.execute(sql.raw(stmt));
      }
      await tx.execute(sql`INSERT INTO "_kdwc_migrations" (name) VALUES (${m.name})`);
    });
    console.log(`[db] applied migration ${m.name}`);
  }
}

async function init(): Promise<DB> {
  const db = await connect();
  // One transaction holding an advisory lock, so parallel serverless cold starts
  // never migrate or seed twice (the second waits, then sees the work is done).
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(424242)`);
    const t = tx as unknown as DB;
    await migrate(t);
    const [{ count }] = (await t.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM users`)).rows;
    if (count === 0) {
      await seedDatabase(t);
      console.log("[db] seeded demo data");
    }
  });
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__kdwcDb) {
    g.__kdwcDb = init().catch((e) => {
      g.__kdwcDb = undefined;
      throw e;
    });
  }
  return g.__kdwcDb;
}

export { schema };
