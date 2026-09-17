import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, passwordNeedsUpgrade, hashPassword } from "@/lib/auth/password";
import { createSession, type AuthUser } from "@/lib/auth/session";
import { consumeLoginAttempt, clearLoginAttempts } from "@/lib/auth/rate-limit";
import { requireSameOrigin, requestIpHash } from "@/lib/auth/request";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let body: { login?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const login = body.login?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const ipKey = requestIpHash(request) ?? "unknown";
  const rateKey = `${ipKey}:${login}`;
  const limit = await consumeLoginAttempt(rateKey);
  if (!limit.allowed) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 900) } });
  const result = await query<AuthUser & { passwordHash: string }>(`SELECT "id","username","email","passwordHash","emailVerifiedAt","sessionGeneration" FROM "User" WHERE "username"=$1 OR "email"=$1 LIMIT 1`, [login]);
  const user = result.rows[0];
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  if (!user || !valid) {
    await query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'login.failed',$3,NOW())`, [randomUUID(), user?.id ?? null, requestIpHash(request)]);
    return NextResponse.json({ error: "Invalid username/email or password." }, { status: 401 });
  }
  await clearLoginAttempts(rateKey);
  if (passwordNeedsUpgrade(user.passwordHash)) await query(`UPDATE "User" SET "passwordHash"=$2,"updatedAt"=NOW() WHERE "id"=$1`, [user.id, await hashPassword(password)]);
  await query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'login.success',$3,NOW())`, [randomUUID(), user.id, requestIpHash(request)]);
  const response = NextResponse.json({ ok: true, username: user.username });
  await createSession(user, request, response);
  return response;
}
