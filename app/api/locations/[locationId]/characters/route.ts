import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const TYPES=new Set(["LIVES_HERE","BORN_HERE","RULES","WORKS_HERE","VISITS","ASSOCIATED"]);

export async function POST(request:NextRequest,{params}:{params:Promise<{locationId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId}=await params,body=await request.json(),characterId=String(body.characterId||""),rawType=String(body.type||"ASSOCIATED"),type=TYPES.has(rawType)?rawType:"ASSOCIATED",notes=String(body.notes||"").slice(0,12000);
  const location=await query<{novelId:string}>(`SELECT l."novelId" FROM "Location" l JOIN "Novel" n ON n."id"=l."novelId" WHERE l."id"=$1 AND n."userId"=$2`,[locationId,user.id]);
  if(!location.rows[0])return NextResponse.json({error:"Location not found"},{status:404});
  const character=await query<{id:string}>(`SELECT "id" FROM "Character" WHERE "id"=$1 AND "novelId"=$2`,[characterId,location.rows[0].novelId]);
  if(!character.rows[0])return NextResponse.json({error:"Character not found"},{status:404});
  const existing=await query<{id:string}>(`SELECT "id" FROM "LocationCharacterLink" WHERE "locationId"=$1 AND "characterId"=$2`,[locationId,characterId]);
  if(existing.rows[0])return NextResponse.json({error:"That character is already linked to this location."},{status:409});
  const id=randomUUID();
  await query(`INSERT INTO "LocationCharacterLink" ("id","locationId","characterId","type","notes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,[id,locationId,characterId,type,notes]);
  return NextResponse.json({id,locationId,characterId,type,notes},{status:201});
}
