import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const colors=["yellow","blue","pink","green"];
export async function PATCH(r:NextRequest,{params}:{params:Promise<{noteId:string}>}){
  if(!requireSameOrigin(r))return NextResponse.json({error:"Invalid origin"},{status:403});
  const u=await currentUser();
  if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {noteId}=await params,b=await r.json();
  const own=await query<{boardId:string|null;chapterId:string|null}>(`SELECT s."boardId",s."chapterId" FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE s."id"=$1 AND n."userId"=$2`,[noteId,u.id]);
  const note=own.rows[0];
  if(!note)return NextResponse.json({error:"Not found"},{status:404});
  const color=colors.includes(b.color)?b.color:"yellow",body=String(b.body||"").slice(0,5000);
  if(note.boardId){
    await query(`UPDATE "StickyNote" SET "body"=$2,"color"=$3,"positionX"=$4,"positionY"=$5,"width"=$6,"height"=$7,"updatedAt"=NOW() WHERE "id"=$1`,[noteId,body,color,Math.max(0,Math.round(Number(b.positionX)||0)),Math.max(0,Math.round(Number(b.positionY)||0)),Math.max(160,Math.round(Number(b.width)||220)),Math.max(120,Math.round(Number(b.height)||180))]);
  }else{
    await query(`UPDATE "StickyNote" SET "body"=$2,"color"=$3,"updatedAt"=NOW() WHERE "id"=$1`,[noteId,body,color]);
  }
  return NextResponse.json({ok:true});
}

export async function DELETE(r:NextRequest,{params}:{params:Promise<{noteId:string}>}){
  if(!requireSameOrigin(r))return NextResponse.json({error:"Invalid origin"},{status:403});
  const u=await currentUser();
  if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {noteId}=await params;
  await query(`DELETE FROM "StickyNote" s USING "Novel" n WHERE s."id"=$1 AND s."novelId"=n."id" AND n."userId"=$2`,[noteId,u.id]);
  return NextResponse.json({ok:true});
}
