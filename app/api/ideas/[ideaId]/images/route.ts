import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
export async function POST(request:NextRequest,{params}:{params:Promise<{ideaId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {ideaId}=await params,body=await request.json(),assetId=String(body.assetId||"");
  const idea=await query<{novelId:string}>(`SELECT s."novelId" FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE s."id"=$1 AND s."kind"='IDEA' AND n."userId"=$2`,[ideaId,user.id]);if(!idea.rows[0])return NextResponse.json({error:"Idea not found"},{status:404});
  if(!((await query(`SELECT "id" FROM "Asset" WHERE "id"=$1 AND "novelId"=$2`,[assetId,idea.rows[0].novelId])).rows[0]))return NextResponse.json({error:"Image not found"},{status:404});
  const existing=await query<{id:string;caption:string;position:number}>(`SELECT "id","caption","position" FROM "IdeaImage" WHERE "ideaId"=$1 AND "assetId"=$2`,[ideaId,assetId]);if(existing.rows[0])return NextResponse.json({...existing.rows[0],assetId,url:`/api/assets/${assetId}`});
  const next=await query<{position:number}>(`SELECT COALESCE(MAX("position"),-1)+1 AS "position" FROM "IdeaImage" WHERE "ideaId"=$1`,[ideaId]),id=randomUUID(),position=Number(next.rows[0]?.position??0);
  await query(`INSERT INTO "IdeaImage" ("id","ideaId","assetId","caption","position","createdAt") VALUES ($1,$2,$3,'',$4,NOW())`,[id,ideaId,assetId,position]);return NextResponse.json({id,assetId,caption:"",position,url:`/api/assets/${assetId}`},{status:201});
}
