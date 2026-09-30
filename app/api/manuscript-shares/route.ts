import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";
import {publicBaseUrl,sendManuscriptShareEmail} from "@/lib/email";
import {createManuscriptShareToken,decryptManuscriptShareToken,manuscriptSharePath} from "@/lib/manuscript-share";

type ShareRow={
  id:string;novelId:string;tokenEncrypted:string;label:string;recipientEmail:string;scope:string;
  expiresAt:Date|null;revokedAt:Date|null;lastViewedAt:Date|null;viewCount:number;createdAt:Date;updatedAt:Date;chapterIds:string[];
};

function shareJson(row:ShareRow){
  let path:string|null=null;
  try{path=manuscriptSharePath(decryptManuscriptShareToken(row.tokenEncrypted))}catch{}
  return {
    id:row.id,label:row.label,recipientEmail:row.recipientEmail,scope:row.scope,
    expiresAt:row.expiresAt?.toISOString()??null,revokedAt:row.revokedAt?.toISOString()??null,
    lastViewedAt:row.lastViewedAt?.toISOString()??null,viewCount:row.viewCount,
    createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),
    chapterIds:row.chapterIds||[],path
  };
}

async function ownedNovel(novelId:string,userId:string){
  return (await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,userId])).rows[0];
}

export async function GET(request:NextRequest){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const novelId=request.nextUrl.searchParams.get("novelId")||"";
  if(!await ownedNovel(novelId,user.id))return NextResponse.json({error:"Not found"},{status:404});
  const shares=await query<ShareRow>(`
    SELECT s.*,COALESCE(array_agg(sc."chapterId") FILTER (WHERE sc."chapterId" IS NOT NULL),'{}') AS "chapterIds"
    FROM "ManuscriptShare" s
    LEFT JOIN "ManuscriptShareChapter" sc ON sc."shareId"=s."id"
    WHERE s."novelId"=$1
    GROUP BY s."id"
    ORDER BY s."createdAt" DESC
  `,[novelId]);
  return NextResponse.json({shares:shares.rows.map(shareJson)});
}

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({}));
  const novelId=String(body.novelId||""),novel=await ownedNovel(novelId,user.id);
  if(!novel)return NextResponse.json({error:"Not found"},{status:404});

  const label=String(body.label||"").trim().slice(0,160);
  const recipientEmail=String(body.recipientEmail||"").trim().toLowerCase().slice(0,320);
  if(recipientEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail))return NextResponse.json({error:"Enter a valid email address."},{status:400});
  const scope=String(body.scope||"ALL")==="SELECTED"?"SELECTED":"ALL";
  const chapterIds=[...new Set((Array.isArray(body.chapterIds)?body.chapterIds:[]).map((id:unknown)=>String(id)).filter(Boolean))];
  if(scope==="SELECTED"&&!chapterIds.length)return NextResponse.json({error:"Choose at least one chapter or page to share."},{status:400});
  if(scope==="SELECTED"){
    const valid=await query<{id:string}>(`SELECT "id" FROM "Chapter" WHERE "novelId"=$1 AND "id"=ANY($2::text[])`,[novelId,chapterIds]);
    if(valid.rows.length!==chapterIds.length)return NextResponse.json({error:"One or more selected manuscript items are invalid."},{status:400});
  }

  let expiresAt:Date|null=null;
  if(body.expiresAt){
    expiresAt=new Date(String(body.expiresAt));
    if(Number.isNaN(expiresAt.getTime())||expiresAt.getTime()<=Date.now())return NextResponse.json({error:"Expiry must be a future date and time."},{status:400});
  }

  const id=randomUUID(),{token,tokenHash,tokenEncrypted}=createManuscriptShareToken(),connection=await db.connect();
  try{
    await connection.query("BEGIN");
    await connection.query(`
      INSERT INTO "ManuscriptShare" ("id","novelId","tokenHash","tokenEncrypted","label","recipientEmail","scope","expiresAt","createdAt","updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
    `,[id,novelId,tokenHash,tokenEncrypted,label,recipientEmail,scope,expiresAt]);
    if(scope==="SELECTED")for(const chapterId of chapterIds)await connection.query(`INSERT INTO "ManuscriptShareChapter" ("shareId","chapterId") VALUES ($1,$2)`,[id,chapterId]);
    await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}

  let emailSent=false,emailError="";
  const path=manuscriptSharePath(token);
  if(body.sendEmail===true){
    if(!recipientEmail)emailError="Enter an email address to send the share.";
    else{
      try{
        const baseUrl=await publicBaseUrl(request);
        await sendManuscriptShareEmail({to:recipientEmail,authorName:user.username,novelTitle:novel.title,label,url:`${baseUrl}${path}`,expiresAt});
        emailSent=true;
      }catch(error){emailError=error instanceof Error?error.message:"The email could not be sent."}
    }
  }

  return NextResponse.json({share:{
    id,label,recipientEmail,scope,expiresAt:expiresAt?.toISOString()??null,revokedAt:null,lastViewedAt:null,viewCount:0,
    createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),chapterIds:scope==="SELECTED"?chapterIds:[],path
  },emailSent,emailError},{status:201});
}
