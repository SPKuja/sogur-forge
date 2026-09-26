import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
export async function POST(request:NextRequest,{params}:{params:Promise<{worldNoteId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId}=await params,body=await request.json(),locationId=String(body.locationId||""),label=String(body.label||"Associated").slice(0,160)||"Associated",notes=String(body.notes||"").slice(0,12000);
  const note=await query<{novelId:string}>(`SELECT w."novelId" FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE w."id"=$1 AND n."userId"=$2`,[worldNoteId,user.id]);if(!note.rows[0])return NextResponse.json({error:"World note not found"},{status:404});
  const location=await query(`SELECT "id" FROM "Location" WHERE "id"=$1 AND "novelId"=$2`,[locationId,note.rows[0].novelId]);if(!location.rows[0])return NextResponse.json({error:"Location not found"},{status:404});
  const exists=await query(`SELECT "id" FROM "WorldNoteLocationLink" WHERE "worldNoteId"=$1 AND "locationId"=$2`,[worldNoteId,locationId]);if(exists.rows[0])return NextResponse.json({error:"That location is already linked."},{status:409});
  const id=randomUUID();await query(`INSERT INTO "WorldNoteLocationLink" ("id","worldNoteId","locationId","label","notes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,[id,worldNoteId,locationId,label,notes]);return NextResponse.json({id,worldNoteId,locationId,label,notes},{status:201});
}
