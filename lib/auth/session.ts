import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { AUTH_POLICY } from "./policy";
import { createOpaqueToken, hashToken } from "./tokens";
import { requestIpHash } from "./request";

export type AuthUser = { id: string; username: string; email: string; emailVerifiedAt: Date | null; sessionGeneration: number };

export async function createSession(user: AuthUser, request: NextRequest, response: NextResponse): Promise<void> {
  const token = createOpaqueToken();
  const now = Date.now();
  const idle = new Date(now + AUTH_POLICY.session.idleTtlMs);
  const absolute = new Date(now + AUTH_POLICY.session.absoluteTtlMs);
  await query(`INSERT INTO "Session" ("id", "tokenHash", "userId", "sessionGeneration", "lastSeenAt", "expiresAt", "absoluteExpiresAt", "ipHash", "userAgent")
    VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,$8)`, [randomUUID(), hashToken(token), user.id, user.sessionGeneration, idle, absolute, requestIpHash(request), request.headers.get("user-agent")?.slice(0, 500) ?? null]);
  response.cookies.set(AUTH_POLICY.session.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: absolute,
  });
}

export async function destroySession(request: NextRequest, response: NextResponse): Promise<void> {
  const token = request.cookies.get(AUTH_POLICY.session.cookieName)?.value;
  if (token) await query(`DELETE FROM "Session" WHERE "tokenHash" = $1`, [hashToken(token)]);
  response.cookies.set(AUTH_POLICY.session.cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

export async function currentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_POLICY.session.cookieName)?.value;
  if (!token) return null;
  const result = await query<AuthUser & { sessionId: string; expiresAt: Date; absoluteExpiresAt: Date; storedGeneration: number }>(
    `SELECT u."id",u."username",u."email",u."emailVerifiedAt",u."sessionGeneration",s."id" AS "sessionId",s."expiresAt",s."absoluteExpiresAt",s."sessionGeneration" AS "storedGeneration"
     FROM "Session" s JOIN "User" u ON u."id"=s."userId" WHERE s."tokenHash"=$1 LIMIT 1`, [hashToken(token)]
  );
  const row = result.rows[0];
  const now = new Date();
  if (!row || row.expiresAt <= now || row.absoluteExpiresAt <= now || row.storedGeneration !== row.sessionGeneration) {
    if (row) await query(`DELETE FROM "Session" WHERE "id"=$1`, [row.sessionId]);
    return null;
  }
  const nextIdle = new Date(Math.min(Date.now() + AUTH_POLICY.session.idleTtlMs, row.absoluteExpiresAt.getTime()));
  await query(`UPDATE "Session" SET "lastSeenAt"=NOW(), "expiresAt"=$2 WHERE "id"=$1`, [row.sessionId, nextIdle]);
  return { id: row.id, username: row.username, email: row.email, emailVerifiedAt: row.emailVerifiedAt, sessionGeneration: row.sessionGeneration };
}
