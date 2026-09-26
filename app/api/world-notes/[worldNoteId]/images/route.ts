import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function POST(request:NextRequest,{params}:{params:Promise<{worldNoteId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId}=await params,body=await request.json(),assetId=String(body.assetId||"");
  const note=await query<{novelId:string}>(`SELECT w."novelId" FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE w."id"=$1 AND n."userId"=$2`,[worldNoteId,user.id]);
  if(!note.rows[0])return NextResponse.json({error:"World note not found"},{status:404});
  const asset=await query(`SELECT "id" FROM "Asset" WHERE "id"=$1 AND "novelId"=$2`,[assetId,note.rows[0].novelId]);
  if(!asset.rows[0])return NextResponse.json({error:"Image not found"},{status:404});
  const existing=await query<{id:string;caption:string;position:number}>(`SELECT "id","caption","position" FROM "WorldNoteImage" WHERE "worldNoteId"=$1 AND "assetId"=$2`,[worldNoteId,assetId]);
  if(existing.rows[0])return NextResponse.json({...existing.rows[0],assetId,url:`/api/assets/${assetId}`});
  const next=await query<{position:number}>(`SELECT COALESCE(MAX("position"),-1)+1 AS "position" FROM "WorldNoteImage" WHERE "worldNoteId"=$1`,[worldNoteId]);
  const id=randomUUID(),position=Number(next.rows[0]?.position??0);
  await query(`INSERT INTO "WorldNoteImage" ("id","worldNoteId","assetId","caption","position","createdAt") VALUES ($1,$2,$3,'',$4,NOW())`,[id,worldNoteId,assetId,position]);
  return NextResponse.json({id,assetId,caption:"",position,url:`/api/assets/${assetId}`},{status:201});
}
