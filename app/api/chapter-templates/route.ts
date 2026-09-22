import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {cleanChapterContentForTemplate,DEFAULT_CHAPTER_TEMPLATE_CONTENT} from "@/lib/chapter-template";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});

  const body=await request.json(),novelId=String(body.novelId||"");
  const owned=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});

  let content=DEFAULT_CHAPTER_TEMPLATE_CONTENT;
  if(body.sourceChapterId){
    const source=await query<{content:string;kind:string}>(
      `SELECT "content","kind" FROM "Chapter" WHERE "id"=$1 AND "novelId"=$2`,
      [String(body.sourceChapterId),novelId]
    );
    if(!source.rows[0]||source.rows[0].kind!=="CHAPTER")return NextResponse.json({error:"Source chapter not found"},{status:400});
    content=cleanChapterContentForTemplate(source.rows[0].content);
  }

  const existing=await query<{count:number}>(`SELECT COUNT(*)::int AS count FROM "ChapterTemplate" WHERE "novelId"=$1`,[novelId]);
  const isDefault=Number(existing.rows[0]?.count||0)===0;
  const id=randomUUID();
  const name=String(body.name||"Chapter Template").trim().slice(0,120)||"Chapter Template";
  await query(
    `INSERT INTO "ChapterTemplate" ("id","novelId","name","isDefault","content","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
    [id,novelId,name,isDefault,content]
  );
  return NextResponse.json({id,name,isDefault,content},{status:201});
}
