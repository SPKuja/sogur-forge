import {unlink} from "node:fs/promises";
import {join} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
const audioDir=process.env.IDEA_AUDIO_DIR||"/app/data/idea-audio";
const statuses=new Set(["INBOX","DEVELOPING","USED","ARCHIVED"]);
async function owned(id:string,userId:string){return (await query<{novelId:string}>(`SELECT s."novelId" FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE s."id"=$1 AND s."kind"='IDEA' AND n."userId"=$2`,[id,userId])).rows[0]}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{ideaId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {ideaId}=await params,owner=await owned(ideaId,user.id);if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),chapterId=body.chapterId?String(body.chapterId):null;
  if(chapterId&&!((await query(`SELECT "id" FROM "Chapter" WHERE "id"=$1 AND "novelId"=$2`,[chapterId,owner.novelId])).rows[0]))return NextResponse.json({error:"Chapter not found"},{status:400});
  const title=String(body.title||"").slice(0,180),text=String(body.body||"").slice(0,20000),category=String(body.category||"Idea").trim().slice(0,120)||"Idea",tags=String(body.tags||"").slice(0,1200),rawStatus=String(body.status||"INBOX"),status=statuses.has(rawStatus)?rawStatus:"INBOX";
  await query(`UPDATE "StickyNote" SET "title"=$2,"body"=$3,"category"=$4,"tags"=$5,"status"=$6,"chapterId"=$7,"updatedAt"=NOW() WHERE "id"=$1`,[ideaId,title,text,category,tags,status,chapterId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);return NextResponse.json({ok:true});
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{ideaId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {ideaId}=await params,owner=await owned(ideaId,user.id);if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  const audio=await query<{storedName:string}>(`SELECT "storedName" FROM "IdeaAudio" WHERE "ideaId"=$1`,[ideaId]);
  await query(`DELETE FROM "StickyNote" WHERE "id"=$1`,[ideaId]);await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  await Promise.all(audio.rows.map(item=>unlink(join(audioDir,item.storedName)).catch(()=>undefined)));return NextResponse.json({ok:true});
}
