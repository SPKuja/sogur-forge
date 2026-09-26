import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

async function owned(userId:string,worldNoteId:string,imageId:string){
  return (await query(`SELECT wi."id" FROM "WorldNoteImage" wi JOIN "WorldNote" w ON w."id"=wi."worldNoteId" JOIN "Novel" n ON n."id"=w."novelId" WHERE wi."id"=$1 AND wi."worldNoteId"=$2 AND n."userId"=$3`,[imageId,worldNoteId,userId])).rows[0];
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{worldNoteId:string;imageId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId,imageId}=await params;if(!await owned(user.id,worldNoteId,imageId))return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),caption=String(body.caption??"").slice(0,300);
  if(body.makePrimary===true){
    const connection=await db.connect();
    try{await connection.query("BEGIN");await connection.query(`UPDATE "WorldNoteImage" SET "position"="position"+1 WHERE "worldNoteId"=$1 AND "id"<>$2`,[worldNoteId,imageId]);await connection.query(`UPDATE "WorldNoteImage" SET "position"=0,"caption"=$3 WHERE "worldNoteId"=$1 AND "id"=$2`,[worldNoteId,imageId,caption]);await connection.query("COMMIT")}catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  }else await query(`UPDATE "WorldNoteImage" SET "caption"=$3 WHERE "worldNoteId"=$1 AND "id"=$2`,[worldNoteId,imageId,caption]);
  return NextResponse.json({ok:true});
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{worldNoteId:string;imageId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId,imageId}=await params;if(!await owned(user.id,worldNoteId,imageId))return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "WorldNoteImage" WHERE "id"=$1`,[imageId]);return NextResponse.json({ok:true});
}
