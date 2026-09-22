import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {normalisePageType,pageTypeDefaultTitle} from "@/lib/manuscript-item";
import {normaliseChapterTemplate,renderChapterTemplateContent} from "@/lib/chapter-template";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json();
  const novelId=String(body.novelId||"");
  const owned=await query<{id:string;title:string}>(
    `SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,
    [novelId,user.id]
  );
  if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});

  const kind=String(body.kind||"CHAPTER").toUpperCase()==="PAGE"?"PAGE":"CHAPTER";
  const pageType=kind==="PAGE"?normalisePageType(body.pageType):null;
  const templateId=kind==="CHAPTER"&&body.templateId?String(body.templateId):null;
  const partId=body.partId?String(body.partId):null;

  let partTitle:string|null=null;
  if(partId){
    const part=await query<{id:string;title:string}>(
      `SELECT "id","title" FROM "Part" WHERE "id"=$1 AND "novelId"=$2`,
      [partId,novelId]
    );
    if(!part.rows[0])return NextResponse.json({error:"Part not found"},{status:400});
    partTitle=part.rows[0].title;
  }

  const pos=await query<{next:number}>(
    `SELECT COALESCE(MAX("position"),-1)+1 AS next FROM "Chapter" WHERE "novelId"=$1`,
    [novelId]
  );
  const fallback=kind==="PAGE"?pageTypeDefaultTitle(pageType):"Untitled Chapter";
  const id=randomUUID();
  const title=String(body.title||"").trim().slice(0,200)||fallback;

  let content="";
  let templateSeededAt:Date|null=null;
  if(templateId){
    const raw=await query<Record<string,unknown>&{id:string;name:string;isDefault:boolean}>(
      `SELECT * FROM "ChapterTemplate" WHERE "id"=$1 AND "novelId"=$2`,
      [templateId,novelId]
    );
    if(!raw.rows[0])return NextResponse.json({error:"Template not found"},{status:400});

    const count=await query<{count:number}>(
      `SELECT COUNT(*)::int AS count FROM "Chapter" WHERE "novelId"=$1 AND "kind"='CHAPTER'`,
      [novelId]
    );
    const template=normaliseChapterTemplate(raw.rows[0]);
    content=renderChapterTemplateContent(template.content,{
      chapterNumber:Number(count.rows[0]?.count||0)+1,
      chapterTitle:title,
      partTitle,
      novelTitle:owned.rows[0].title
    });
    templateSeededAt=new Date();
  }

  await query(
    `INSERT INTO "Chapter"
       ("id","novelId","partId","title","kind","pageType","content","templateId","templateSeededAt","position","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
    [id,novelId,partId,title,kind,pageType,content,templateId,templateSeededAt,pos.rows[0].next]
  );
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);

  return NextResponse.json({
    id,title,kind,pageType,content,summary:"",status:"DRAFT",
    position:pos.rows[0].next,partId,partTitle,templateId,headerImageAssetId:null
  },{status:201});
}
