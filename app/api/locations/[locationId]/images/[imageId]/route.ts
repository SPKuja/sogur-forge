import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

async function owned(userId:string,locationId:string,imageId:string){
  return (await query<{id:string;assetId:string}>(`SELECT li."id",li."assetId" FROM "LocationImage" li JOIN "Location" l ON l."id"=li."locationId" JOIN "Novel" n ON n."id"=l."novelId" WHERE li."id"=$1 AND li."locationId"=$2 AND n."userId"=$3`,[imageId,locationId,userId])).rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{locationId:string;imageId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId,imageId}=await params,image=await owned(user.id,locationId,imageId);
  if(!image)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),caption=String(body.caption??"").slice(0,300);
  if(body.makePrimary===true){
    const connection=await db.connect();
    try{
      await connection.query("BEGIN");
      await connection.query(`UPDATE "LocationImage" SET "position"="position"+1 WHERE "locationId"=$1 AND "id"<>$2`,[locationId,imageId]);
      await connection.query(`UPDATE "LocationImage" SET "position"=0,"caption"=$3 WHERE "locationId"=$1 AND "id"=$2`,[locationId,imageId,caption]);
      await connection.query("COMMIT");
    }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  }else await query(`UPDATE "LocationImage" SET "caption"=$3 WHERE "locationId"=$1 AND "id"=$2`,[locationId,imageId,caption]);
  return NextResponse.json({ok:true});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{locationId:string;imageId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId,imageId}=await params,image=await owned(user.id,locationId,imageId);
  if(!image)return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "LocationImage" WHERE "id"=$1`,[imageId]);
  return NextResponse.json({ok:true});
}
