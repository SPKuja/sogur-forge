import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { requireSameOrigin } from "@/lib/auth/request";

export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  await destroySession(request, response);
  return response;
}
