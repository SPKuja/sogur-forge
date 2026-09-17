import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { sogurPool?: Pool };

export const db = globalForDb.sogurPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

if (process.env.NODE_ENV !== "production") globalForDb.sogurPool = db;

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return db.query<T>(text, values);
}
