import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function POST(request:NextRequest,{params}:{params:Promise<{worldNoteId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId}=await params,body=await request.json(),characterId=String(body.characterId||""),label=String(body.label||"Associated").slice(0,160)||"Associated",notes=String(body.notes||"").slice(0,12000);
  const note=await query<{novelId:string}>(`SELECT w."novelId" FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE w."id"=$1 AND n."userId"=$2`,[worldNoteId,user.id]);
  if(!note.rows[0])return NextResponse.json({error:"World note not found"},{status:404});
  const character=await query(`SELECT "id" FROM "Character" WHERE "id"=$1 AND "novelId"=$2`,[characterId,note.rows[0].novelId]);
  if(!character.rows[0])return NextResponse.json({error:"Character not found"},{status:404});
  const exists=await query(`SELECT "id" FROM "WorldNoteCharacterLink" WHERE "worldNoteId"=$1 AND "characterId"=$2`,[worldNoteId,characterId]);
  if(exists.rows[0])return NextResponse.json({error:"That character is already linked."},{status:409});
  const id=randomUUID();await query(`INSERT INTO "WorldNoteCharacterLink" ("id","worldNoteId","characterId","label","notes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,[id,worldNoteId,characterId,label,notes]);
  return NextResponse.json({id,worldNoteId,characterId,label,notes},{status:201});
}
