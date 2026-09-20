import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),novelId=String(body.novelId||"");
  const owned=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const templateId=body.templateId?String(body.templateId):null;
  if(templateId){const template=await query(`SELECT "id" FROM "ChapterTemplate" WHERE "id"=$1 AND "novelId"=$2`,[templateId,novelId]);if(!template.rows[0])return NextResponse.json({error:"Template not found"},{status:400})}
  const pos=await query<{next:number}>(`SELECT COALESCE(MAX("position"),-1)+1 AS next FROM "Chapter" WHERE "novelId"=$1`,[novelId]);
  const id=randomUUID(),title=String(body.title||"").trim().slice(0,200)||"Untitled Chapter",partId=body.partId?String(body.partId):null;
  await query(`INSERT INTO "Chapter" ("id","novelId","partId","title","templateId","position","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,[id,novelId,partId,title,templateId,pos.rows[0].next]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
  return NextResponse.json({id,title,content:"",summary:"",status:"DRAFT",position:pos.rows[0].next,partId,partTitle:null,templateId,headerImageAssetId:null},{status:201});
}
