import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { createSession, type AuthUser } from "@/lib/auth/session";
import { requireSameOrigin, requestIpHash } from "@/lib/auth/request";
import { CURRENT_VERSION } from "@/lib/releases";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let body: { username?: string; email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const username = body.username?.trim().toLowerCase() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username)) return NextResponse.json({ error: "Username must be 3–32 characters using letters, numbers, _ or -." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  try { validatePassword(password); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid password." }, { status: 400 }); }
  const passwordHash = await hashPassword(password);
  const user: AuthUser = { id: randomUUID(), username, email, passwordHash: undefined, emailVerifiedAt: null, sessionGeneration: 1 } as unknown as AuthUser;
  try {
    await query(`INSERT INTO "User" ("id","username","email","passwordHash","sessionGeneration","lastSeenVersion","createdAt","updatedAt") VALUES ($1,$2,$3,$4,1,$5,NOW(),NOW())`, [user.id, username, email, passwordHash, CURRENT_VERSION]);
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "23505") return NextResponse.json({ error: "That username or email is already in use." }, { status: 409 });
    throw error;
  }
  await query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'account.created',$3,NOW())`, [randomUUID(), user.id, requestIpHash(request)]);
  const response = NextResponse.json({ ok: true, username });
  await createSession(user, request, response);
  return response;
}
