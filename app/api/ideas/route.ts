import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

const statuses=new Set(["INBOX","DEVELOPING","USED","ARCHIVED"]);
async function ownedChapter(chapterId:string|null,novelId:string){if(!chapterId)return true;return Boolean((await query(`SELECT "id" FROM "Chapter" WHERE "id"=$1 AND "novelId"=$2`,[chapterId,novelId])).rows[0])}
export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),novelId=String(body.novelId||""),boardId=body.boardId?String(body.boardId):null,chapterId=body.chapterId?String(body.chapterId):null;
  const novel=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);if(!novel.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  if(!await ownedChapter(chapterId,novelId))return NextResponse.json({error:"Chapter not found"},{status:400});
  if(boardId){const board=await query(`SELECT "id" FROM "CorkBoard" WHERE "id"=$1 AND "novelId"=$2`,[boardId,novelId]);if(!board.rows[0])return NextResponse.json({error:"Board not found"},{status:400})}
  const id=randomUUID(),title=String(body.title||"").trim().slice(0,180),text=String(body.body||"").slice(0,20000),category=String(body.category||"Idea").trim().slice(0,120)||"Idea",tags=String(body.tags||"").slice(0,1200),rawStatus=String(body.status||"INBOX"),status=statuses.has(rawStatus)?rawStatus:"INBOX",anchorId=chapterId&&body.anchorId?String(body.anchorId).slice(0,100):null,anchorQuote=chapterId&&body.anchorQuote?String(body.anchorQuote).slice(0,1000):null;
  const connection=await db.connect();let placement=null;
  try{
    await connection.query("BEGIN");
    await connection.query(`INSERT INTO "StickyNote" ("id","novelId","kind","title","body","category","tags","status","chapterId","anchorId","anchorQuote","createdAt","updatedAt") VALUES ($1,$2,'IDEA',$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,[id,novelId,title,text,category,tags,status,chapterId,anchorId,anchorQuote]);
    if(boardId){const placementId=randomUUID(),x=Math.max(0,Math.round(Number(body.positionX)||60)),y=Math.max(0,Math.round(Number(body.positionY)||60));await connection.query(`INSERT INTO "IdeaBoardPlacement" ("id","ideaId","boardId","color","positionX","positionY","width","height","createdAt","updatedAt") VALUES ($1,$2,$3,'yellow',$4,$5,240,190,NOW(),NOW())`,[placementId,id,boardId,x,y]);placement={id:placementId,ideaId:id,boardId,color:"yellow",positionX:x,positionY:y,width:240,height:190}}
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  return NextResponse.json({id,title,body:text,category,tags,status,chapterId,anchorId,anchorQuote,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),placement},{status:201});
}
