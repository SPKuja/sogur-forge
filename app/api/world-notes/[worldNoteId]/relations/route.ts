import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
export async function POST(request:NextRequest,{params}:{params:Promise<{worldNoteId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId}=await params,body=await request.json(),targetId=String(body.targetId||""),label=String(body.label||"Related").slice(0,160)||"Related",notes=String(body.notes||"").slice(0,12000);
  if(targetId===worldNoteId)return NextResponse.json({error:"A world note cannot link to itself."},{status:400});
  const source=await query<{novelId:string}>(`SELECT w."novelId" FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE w."id"=$1 AND n."userId"=$2`,[worldNoteId,user.id]);if(!source.rows[0])return NextResponse.json({error:"World note not found"},{status:404});
  const target=await query(`SELECT "id" FROM "WorldNote" WHERE "id"=$1 AND "novelId"=$2`,[targetId,source.rows[0].novelId]);if(!target.rows[0])return NextResponse.json({error:"Related world note not found"},{status:404});
  const exists=await query(`SELECT "id" FROM "WorldNoteRelation" WHERE ("sourceId"=$1 AND "targetId"=$2) OR ("sourceId"=$2 AND "targetId"=$1)`,[worldNoteId,targetId]);if(exists.rows[0])return NextResponse.json({error:"Those world notes are already linked."},{status:409});
  const id=randomUUID();await query(`INSERT INTO "WorldNoteRelation" ("id","sourceId","targetId","label","notes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,[id,worldNoteId,targetId,label,notes]);return NextResponse.json({id,sourceId:worldNoteId,targetId,label,notes},{status:201});
}
