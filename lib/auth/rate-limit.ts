import { query } from "@/lib/db";
import { AUTH_POLICY } from "./policy";
import { hashPrivateValue } from "./request";

export async function consumeLoginAttempt(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const keyHash = hashPrivateValue(`login:${key.toLowerCase()}`);
  const now = new Date();
  const result = await query<{ attempts: number; windowStart: Date; blockedUntil: Date | null }>(
    `SELECT "attempts", "windowStart", "blockedUntil" FROM "RateLimit" WHERE "keyHash" = $1`, [keyHash]
  );
  const row = result.rows[0];
  if (row?.blockedUntil && row.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((row.blockedUntil.getTime() - now.getTime()) / 1000)) };
  }
  if (!row || now.getTime() - row.windowStart.getTime() >= AUTH_POLICY.login.windowMs) {
    await query(`INSERT INTO "RateLimit" ("keyHash", "attempts", "windowStart", "updatedAt") VALUES ($1, 1, $2, $2)
      ON CONFLICT ("keyHash") DO UPDATE SET "attempts" = 1, "windowStart" = $2, "blockedUntil" = NULL, "updatedAt" = $2`, [keyHash, now]);
    return { allowed: true };
  }
  const attempts = row.attempts + 1;
  const blockedUntil = attempts > AUTH_POLICY.login.attemptsPerWindow ? new Date(now.getTime() + AUTH_POLICY.login.windowMs) : null;
  await query(`UPDATE "RateLimit" SET "attempts" = $2, "blockedUntil" = $3, "updatedAt" = $4 WHERE "keyHash" = $1`, [keyHash, attempts, blockedUntil, now]);
  return blockedUntil ? { allowed: false, retryAfterSeconds: Math.ceil(AUTH_POLICY.login.windowMs / 1000) } : { allowed: true };
}

export async function clearLoginAttempts(key: string): Promise<void> {
  const keyHash = hashPrivateValue(`login:${key.toLowerCase()}`);
  await query(`DELETE FROM "RateLimit" WHERE "keyHash" = $1`, [keyHash]);
}
