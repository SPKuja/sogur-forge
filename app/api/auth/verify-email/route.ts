import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {hashToken} from "@/lib/auth/tokens";
import {requestIpHash} from "@/lib/auth/request";

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token")||"";
  if(!token)return NextResponse.redirect(new URL("/?verified=invalid",request.url));
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const row=(await connection.query<{id:string;userId:string;expiresAt:Date;usedAt:Date|null}>(`SELECT "id","userId","expiresAt","usedAt" FROM "VerificationToken" WHERE "tokenHash"=$1 AND "purpose"='EMAIL_VERIFY' FOR UPDATE`,[hashToken(token)])).rows[0];
    if(!row||row.usedAt||row.expiresAt<=new Date()){await connection.query("ROLLBACK");return NextResponse.redirect(new URL("/?verified=invalid",request.url))}
    await connection.query(`UPDATE "User" SET "emailVerifiedAt"=COALESCE("emailVerifiedAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1`,[row.userId]);
    await connection.query(`UPDATE "VerificationToken" SET "usedAt"=NOW() WHERE "id"=$1`,[row.id]);
    await connection.query(`UPDATE "VerificationToken" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "userId"=$1 AND "purpose"='EMAIL_VERIFY' AND "id"<>$2 AND "usedAt" IS NULL`,[row.userId,row.id]);
    await connection.query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'email.verified',$3,NOW())`,[randomUUID(),row.userId,requestIpHash(request)]);
    await connection.query("COMMIT");
    return NextResponse.redirect(new URL("/?verified=1",request.url));
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}
