import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {normalisePageType,pageTypeDefaultTitle} from "@/lib/manuscript-item";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),novelId=String(body.novelId||"");
  const owned=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const kind=String(body.kind||"CHAPTER").toUpperCase()==="PAGE"?"PAGE":"CHAPTER",pageType=kind==="PAGE"?normalisePageType(body.pageType):null;
  const templateId=kind==="CHAPTER"&&body.templateId?String(body.templateId):null;
  if(templateId){const template=await query(`SELECT "id" FROM "ChapterTemplate" WHERE "id"=$1 AND "novelId"=$2`,[templateId,novelId]);if(!template.rows[0])return NextResponse.json({error:"Template not found"},{status:400})}
  const partId=body.partId?String(body.partId):null;
  if(partId){const part=await query(`SELECT "id" FROM "Part" WHERE "id"=$1 AND "novelId"=$2`,[partId,novelId]);if(!part.rows[0])return NextResponse.json({error:"Part not found"},{status:400})}
  const pos=await query<{next:number}>(`SELECT COALESCE(MAX("position"),-1)+1 AS next FROM "Chapter" WHERE "novelId"=$1`,[novelId]);
  const fallback=kind==="PAGE"?pageTypeDefaultTitle(pageType):"Untitled Chapter",id=randomUUID(),title=String(body.title||"").trim().slice(0,200)||fallback;
  await query(`INSERT INTO "Chapter" ("id","novelId","partId","title","kind","pageType","templateId","position","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,[id,novelId,partId,title,kind,pageType,templateId,pos.rows[0].next]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
  return NextResponse.json({id,title,kind,pageType,content:"",summary:"",status:"DRAFT",position:pos.rows[0].next,partId,partTitle:null,templateId,headerImageAssetId:null},{status:201});
}
