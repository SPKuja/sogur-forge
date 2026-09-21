import {randomUUID} from "node:crypto";
import {query} from "@/lib/db";
import {AUTH_POLICY} from "./policy";
import {createOpaqueToken,hashToken} from "./tokens";
async function issue(userId:string,purpose:string,ttlMs:number){const token=createOpaqueToken(),expiresAt=new Date(Date.now()+ttlMs);await query(`UPDATE "VerificationToken" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "userId"=$1 AND "purpose"=$2 AND "usedAt" IS NULL`,[userId,purpose]);await query(`INSERT INTO "VerificationToken" ("id","tokenHash","userId","purpose","expiresAt","createdAt") VALUES ($1,$2,$3,$4,$5,NOW())`,[randomUUID(),hashToken(token),userId,purpose,expiresAt]);return token}
export function issueEmailVerification(userId:string){return issue(userId,"EMAIL_VERIFY",AUTH_POLICY.verification.emailTtlMs)}
export function issuePasswordReset(userId:string){return issue(userId,"PASSWORD_RESET",AUTH_POLICY.verification.passwordResetTtlMs)}
