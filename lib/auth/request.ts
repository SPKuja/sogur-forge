import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return value;
}

export function hashPrivateValue(value: string): string {
  return createHash("sha256").update(`${secret()}:${value}`).digest("hex");
}

export function requestIpHash(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || real;
  return ip ? hashPrivateValue(`ip:${ip}`) : null;
}

export function requireSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
    if (!host) return false;
    const expected = `${proto}://${host}`;
    const a = Buffer.from(originUrl.origin);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
