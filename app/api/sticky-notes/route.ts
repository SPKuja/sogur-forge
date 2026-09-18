import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const colors=["yellow","blue","pink","green"];
export async function POST(r:NextRequest){
  if(!requireSameOrigin(r))return NextResponse.json({error:"Invalid origin"},{status:403});
  const u=await currentUser();
  if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});
  const b=await r.json();
  const boardId=typeof b.boardId==="string"&&b.boardId?b.boardId:null;
  const chapterId=typeof b.chapterId==="string"&&b.chapterId?b.chapterId:null;
  if((boardId?1:0)+(chapterId?1:0)!==1)return NextResponse.json({error:"Choose a board or chapter"},{status:400});
  const color=colors.includes(b.color)?b.color:"yellow";
  const body=String(b.body||"").slice(0,5000);
  const anchorId=chapterId&&b.anchorId?String(b.anchorId).slice(0,100):null;
  const anchorQuote=chapterId&&b.anchorQuote?String(b.anchorQuote).slice(0,1000):null;
  const id=randomUUID();

  if(boardId){
    const own=await query<{novelId:string}>(`SELECT b."novelId" FROM "CorkBoard" b JOIN "Novel" n ON n."id"=b."novelId" WHERE b."id"=$1 AND n."userId"=$2`,[boardId,u.id]);
    if(!own.rows[0])return NextResponse.json({error:"Not found"},{status:404});
    const x=Math.max(0,Math.round(Number(b.positionX)||40)),y=Math.max(0,Math.round(Number(b.positionY)||40));
    await query(`INSERT INTO "StickyNote" ("id","novelId","boardId","body","color","positionX","positionY") VALUES ($1,$2,$3,$4,$5,$6,$7)`,[id,own.rows[0].novelId,boardId,body,color,x,y]);
    return NextResponse.json({id,boardId,chapterId:null,body,color,positionX:x,positionY:y,width:220,height:180,anchorId:null,anchorQuote:null},{status:201});
  }

  const own=await query<{novelId:string}>(`SELECT c."novelId" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2`,[chapterId,u.id]);
  if(!own.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  await query(`INSERT INTO "StickyNote" ("id","novelId","chapterId","body","color","anchorId","anchorQuote") VALUES ($1,$2,$3,$4,$5,$6,$7)`,[id,own.rows[0].novelId,chapterId,body,color,anchorId,anchorQuote]);
  return NextResponse.json({id,boardId:null,chapterId,body,color,positionX:40,positionY:40,width:220,height:180,anchorId,anchorQuote},{status:201});
}
