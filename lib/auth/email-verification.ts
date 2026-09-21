import {randomUUID} from "node:crypto";
import {query} from "@/lib/db";
import {AUTH_POLICY} from "./policy";
import {createOpaqueToken,hashToken} from "./tokens";

export async function issueEmailVerification(userId:string){
  const token=createOpaqueToken(),expiresAt=new Date(Date.now()+AUTH_POLICY.verification.emailTtlMs);
  await query(`UPDATE "VerificationToken" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "userId"=$1 AND "purpose"='EMAIL_VERIFY' AND "usedAt" IS NULL`,[userId]);
  await query(`INSERT INTO "VerificationToken" ("id","tokenHash","userId","purpose","expiresAt","createdAt") VALUES ($1,$2,$3,'EMAIL_VERIFY',$4,NOW())`,[randomUUID(),hashToken(token),userId,expiresAt]);
  return token;
}
