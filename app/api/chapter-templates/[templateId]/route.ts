import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{templateId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {templateId}=await params,body=await request.json();
  const current=await query<{novelId:string;name:string;eyebrowPattern:string;titlePattern:string;showImage:boolean;headerImageAssetId:string|null;imageWidth:number;imageAlign:string;isDefault:boolean}>(`SELECT t."novelId",t."name",t."eyebrowPattern",t."titlePattern",t."showImage",t."headerImageAssetId",t."imageWidth",t."imageAlign",t."isDefault" FROM "ChapterTemplate" t JOIN "Novel" n ON n."id"=t."novelId" WHERE t."id"=$1 AND n."userId"=$2`,[templateId,user.id]);
  if(!current.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const old=current.rows[0],name=String(body.name??old.name).trim().slice(0,120)||old.name,eyebrowPattern=String(body.eyebrowPattern??old.eyebrowPattern).slice(0,240),titlePattern=String(body.titlePattern??old.titlePattern).slice(0,240),showImage=body.showImage===undefined?old.showImage:Boolean(body.showImage),imageWidth=Math.max(20,Math.min(100,Number(body.imageWidth??old.imageWidth)||100)),imageAlign=["LEFT","CENTER","RIGHT"].includes(String(body.imageAlign))?String(body.imageAlign):old.imageAlign;
  let headerImageAssetId=body.headerImageAssetId===undefined?old.headerImageAssetId:(body.headerImageAssetId?String(body.headerImageAssetId):null);
  if(headerImageAssetId){
    const asset=await query(`SELECT "id" FROM "Asset" WHERE "id"=$1 AND "novelId"=$2`,[headerImageAssetId,old.novelId]);
    if(!asset.rows[0])return NextResponse.json({error:"Header image not found"},{status:400});
  }
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    if(body.makeDefault===true)await connection.query(`UPDATE "ChapterTemplate" SET "isDefault"=false,"updatedAt"=NOW() WHERE "novelId"=$1`,[old.novelId]);
    await connection.query(`UPDATE "ChapterTemplate" SET "name"=$2,"eyebrowPattern"=$3,"titlePattern"=$4,"showImage"=$5,"headerImageAssetId"=$6,"imageWidth"=$7,"imageAlign"=$8,"isDefault"=CASE WHEN $9 THEN true ELSE "isDefault" END,"updatedAt"=NOW() WHERE "id"=$1`,[templateId,name,eyebrowPattern,titlePattern,showImage,headerImageAssetId,imageWidth,imageAlign,body.makeDefault===true]);
    if(body.applyToUnassigned===true)await connection.query(`UPDATE "Chapter" SET "templateId"=$2,"updatedAt"=NOW() WHERE "novelId"=$1 AND "templateId" IS NULL`,[old.novelId,templateId]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[old.novelId]);
    await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  return NextResponse.json({id:templateId,name,eyebrowPattern,titlePattern,showImage,headerImageAssetId,imageWidth,imageAlign,isDefault:body.makeDefault===true||old.isDefault,headerImageUrl:headerImageAssetId?`/api/assets/${headerImageAssetId}`:null});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{templateId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {templateId}=await params;
  const current=await query<{novelId:string;isDefault:boolean}>(`SELECT t."novelId",t."isDefault" FROM "ChapterTemplate" t JOIN "Novel" n ON n."id"=t."novelId" WHERE t."id"=$1 AND n."userId"=$2`,[templateId,user.id]);
  if(!current.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  if(current.rows[0].isDefault)return NextResponse.json({error:"Choose another default template before deleting this one."},{status:409});
  await query(`DELETE FROM "ChapterTemplate" WHERE "id"=$1`,[templateId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[current.rows[0].novelId]);
  return NextResponse.json({ok:true});
}
