import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),novelId=String(body.novelId||""),category=String(body.category||"Lore").trim().slice(0,120)||"Lore";
  const owned=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const next=await query<{position:number}>(`SELECT COALESCE(MAX("position"),-1)+1 AS "position" FROM "WorldNote" WHERE "novelId"=$1`,[novelId]);
  const id=randomUUID(),position=Number(next.rows[0]?.position??0);
  const created=await query(`INSERT INTO "WorldNote" ("id","novelId","name","category","position","createdAt","updatedAt") VALUES ($1,$2,'New World Note',$3,$4,NOW(),NOW()) RETURNING "id","name","aliases","category","summary","details","significance","notes","position"`,[id,novelId,category,position]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
  return NextResponse.json(created.rows[0],{status:201});
}
