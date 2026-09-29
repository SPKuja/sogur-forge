import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
const colors=new Set(["yellow","blue","pink","green"]);
export async function POST(request:NextRequest,{params}:{params:Promise<{ideaId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const {ideaId}=await params,body=await request.json(),boardId=String(body.boardId||"");
  const owned=await query(`SELECT s."id" FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" JOIN "CorkBoard" b ON b."novelId"=s."novelId" WHERE s."id"=$1 AND s."kind"='IDEA' AND b."id"=$2 AND n."userId"=$3`,[ideaId,boardId,user.id]);if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const exists=await query(`SELECT "id" FROM "IdeaBoardPlacement" WHERE "ideaId"=$1 AND "boardId"=$2`,[ideaId,boardId]);if(exists.rows[0])return NextResponse.json({error:"This idea is already on that board."},{status:409});
  const id=randomUUID(),color=colors.has(String(body.color))?String(body.color):"yellow",positionX=Math.max(0,Math.round(Number(body.positionX)||60)),positionY=Math.max(0,Math.round(Number(body.positionY)||60));
  await query(`INSERT INTO "IdeaBoardPlacement" ("id","ideaId","boardId","color","positionX","positionY","width","height","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,240,190,NOW(),NOW())`,[id,ideaId,boardId,color,positionX,positionY]);return NextResponse.json({id,ideaId,boardId,color,positionX,positionY,width:240,height:190},{status:201});
}
