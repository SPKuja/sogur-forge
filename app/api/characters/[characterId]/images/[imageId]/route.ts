import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

async function owned(userId:string,characterId:string,imageId:string){
  return (await query<{id:string;characterId:string;assetId:string}>(`SELECT ci."id",ci."characterId",ci."assetId" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE ci."id"=$1 AND ci."characterId"=$2 AND n."userId"=$3`,[imageId,characterId,userId])).rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{characterId:string;imageId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {characterId,imageId}=await params,image=await owned(user.id,characterId,imageId);
  if(!image)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),caption=String(body.caption??"").slice(0,300);
  if(body.makePrimary===true){
    const connection=await db.connect();
    try{
      await connection.query("BEGIN");
      await connection.query(`UPDATE "CharacterImage" SET "position"="position"+1 WHERE "characterId"=$1 AND "id"<>$2`,[characterId,imageId]);
      await connection.query(`UPDATE "CharacterImage" SET "position"=0,"caption"=$3 WHERE "characterId"=$1 AND "id"=$2`,[characterId,imageId,caption]);
      await connection.query("COMMIT");
    }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  }else{
    await query(`UPDATE "CharacterImage" SET "caption"=$3 WHERE "characterId"=$1 AND "id"=$2`,[characterId,imageId,caption]);
  }
  return NextResponse.json({ok:true});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{characterId:string;imageId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {characterId,imageId}=await params,image=await owned(user.id,characterId,imageId);
  if(!image)return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "CharacterImage" WHERE "id"=$1`,[imageId]);
  return NextResponse.json({ok:true});
}
