import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}
