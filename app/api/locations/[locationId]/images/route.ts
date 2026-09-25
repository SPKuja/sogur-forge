import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function POST(request:NextRequest,{params}:{params:Promise<{locationId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId}=await params,body=await request.json(),assetId=String(body.assetId||"");
  const location=await query<{novelId:string}>(`SELECT l."novelId" FROM "Location" l JOIN "Novel" n ON n."id"=l."novelId" WHERE l."id"=$1 AND n."userId"=$2`,[locationId,user.id]);
  if(!location.rows[0])return NextResponse.json({error:"Location not found"},{status:404});
  const asset=await query<{id:string}>(`SELECT "id" FROM "Asset" WHERE "id"=$1 AND "novelId"=$2`,[assetId,location.rows[0].novelId]);
  if(!asset.rows[0])return NextResponse.json({error:"Image not found"},{status:404});
  const existing=await query<{id:string;caption:string;position:number}>(`SELECT "id","caption","position" FROM "LocationImage" WHERE "locationId"=$1 AND "assetId"=$2`,[locationId,assetId]);
  if(existing.rows[0])return NextResponse.json({...existing.rows[0],assetId,url:`/api/assets/${assetId}`});
  const next=await query<{position:number}>(`SELECT COALESCE(MAX("position"),-1)+1 AS "position" FROM "LocationImage" WHERE "locationId"=$1`,[locationId]);
  const id=randomUUID(),position=Number(next.rows[0]?.position??0);
  await query(`INSERT INTO "LocationImage" ("id","locationId","assetId","caption","position","createdAt") VALUES ($1,$2,$3,'',$4,NOW())`,[id,locationId,assetId,position]);
  return NextResponse.json({id,assetId,caption:"",position,url:`/api/assets/${assetId}`},{status:201});
}
