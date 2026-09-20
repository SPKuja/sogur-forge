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
  const existing=await query<{count:number}>(`SELECT COUNT(*)::int AS count FROM "ChapterTemplate" WHERE "novelId"=$1`,[novelId]);
  const isDefault=Number(existing.rows[0]?.count||0)===0,id=randomUUID(),name=String(body.name||"Chapter Template").trim().slice(0,120)||"Chapter Template";
  const created=await query(`INSERT INTO "ChapterTemplate" ("id","novelId","name","isDefault","eyebrowPattern","titlePattern","showImage","imageWidth","imageAlign","createdAt","updatedAt") VALUES ($1,$2,$3,$4,'CHAPTER {{chapter_number_roman}}','{{chapter_title}}',false,100,'CENTER',NOW(),NOW()) RETURNING "name","isDefault","eyebrowPattern","titlePattern","showImage","headerImageAssetId","imageWidth","imageAlign","imagePosition","imageSpacing","labelAlign","labelSize","labelWeight","labelFont","labelSpacing","titleAlign","titleSize","titleWeight","titleFont","titleSpacing","showDivider","dividerWidth","dividerThickness","headerPaddingTop","headerPaddingBottom"`,[id,novelId,name,isDefault]);
  return NextResponse.json({...created.rows[0],headerImageUrl:null},{status:201});
}
