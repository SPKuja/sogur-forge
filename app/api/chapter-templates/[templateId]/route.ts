import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

const aligns=new Set(["LEFT","CENTER","RIGHT"]),fonts=new Set(["SERIF","SANS"]),positions=new Set(["BEFORE_LABEL","BETWEEN_LABEL_TITLE","AFTER_TITLE","AFTER_DIVIDER"]);
const clamp=(value:unknown,min:number,max:number,fallback:number)=>Math.max(min,Math.min(max,Number(value) || fallback));

type Existing={
  novelId:string;name:string;isDefault:boolean;eyebrowPattern:string;titlePattern:string;showImage:boolean;headerImageAssetId:string|null;imageWidth:number;imageAlign:string;imagePosition:string;imageSpacing:number;labelAlign:string;labelSize:number;labelWeight:number;labelFont:string;labelSpacing:number;titleAlign:string;titleSize:number;titleWeight:number;titleFont:string;titleSpacing:number;showDivider:boolean;dividerWidth:number;dividerThickness:number;headerPaddingTop:number;headerPaddingBottom:number;
};

export async function PATCH(request:NextRequest,{params}:{params:Promise<{templateId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {templateId}=await params,body=await request.json();
  const current=await query<Existing>(`SELECT t."novelId",t."name",t."isDefault",t."eyebrowPattern",t."titlePattern",t."showImage",t."headerImageAssetId",t."imageWidth",t."imageAlign",t."imagePosition",t."imageSpacing",t."labelAlign",t."labelSize",t."labelWeight",t."labelFont",t."labelSpacing",t."titleAlign",t."titleSize",t."titleWeight",t."titleFont",t."titleSpacing",t."showDivider",t."dividerWidth",t."dividerThickness",t."headerPaddingTop",t."headerPaddingBottom" FROM "ChapterTemplate" t JOIN "Novel" n ON n."id"=t."novelId" WHERE t."id"=$1 AND n."userId"=$2`,[templateId,user.id]);
  if(!current.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const old=current.rows[0],name=String(body.name??old.name).trim().slice(0,120)||old.name,eyebrowPattern=String(body.eyebrowPattern??old.eyebrowPattern).slice(0,240),titlePattern=String(body.titlePattern??old.titlePattern).slice(0,240),showImage=body.showImage===undefined?old.showImage:Boolean(body.showImage),showDivider=body.showDivider===undefined?old.showDivider:Boolean(body.showDivider);
  let headerImageAssetId=body.headerImageAssetId===undefined?old.headerImageAssetId:(body.headerImageAssetId?String(body.headerImageAssetId):null);
  if(headerImageAssetId){const asset=await query(`SELECT "id" FROM "Asset" WHERE "id"=$1 AND "novelId"=$2`,[headerImageAssetId,old.novelId]);if(!asset.rows[0])return NextResponse.json({error:"Header image not found"},{status:400})}
  const imageWidth=clamp(body.imageWidth,20,100,old.imageWidth),imageAlign=aligns.has(String(body.imageAlign))?String(body.imageAlign):old.imageAlign,imagePosition=positions.has(String(body.imagePosition))?String(body.imagePosition):old.imagePosition,imageSpacing=clamp(body.imageSpacing,0,100,old.imageSpacing);
  const labelAlign=aligns.has(String(body.labelAlign))?String(body.labelAlign):old.labelAlign,labelSize=clamp(body.labelSize,8,28,old.labelSize),labelWeight=clamp(body.labelWeight,300,900,old.labelWeight),labelFont=fonts.has(String(body.labelFont))?String(body.labelFont):old.labelFont,labelSpacing=clamp(body.labelSpacing,0,80,old.labelSpacing);
  const titleAlign=aligns.has(String(body.titleAlign))?String(body.titleAlign):old.titleAlign,titleSize=clamp(body.titleSize,20,80,old.titleSize),titleWeight=clamp(body.titleWeight,300,900,old.titleWeight),titleFont=fonts.has(String(body.titleFont))?String(body.titleFont):old.titleFont,titleSpacing=clamp(body.titleSpacing,0,100,old.titleSpacing);
  const dividerWidth=clamp(body.dividerWidth,3,100,old.dividerWidth),dividerThickness=clamp(body.dividerThickness,1,5,old.dividerThickness),headerPaddingTop=clamp(body.headerPaddingTop,0,180,old.headerPaddingTop),headerPaddingBottom=clamp(body.headerPaddingBottom,0,180,old.headerPaddingBottom);
  const values={name,eyebrowPattern,titlePattern,showImage,headerImageAssetId,imageWidth,imageAlign,imagePosition,imageSpacing,labelAlign,labelSize,labelWeight,labelFont,labelSpacing,titleAlign,titleSize,titleWeight,titleFont,titleSpacing,showDivider,dividerWidth,dividerThickness,headerPaddingTop,headerPaddingBottom};
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    if(body.makeDefault===true)await connection.query(`UPDATE "ChapterTemplate" SET "isDefault"=false,"updatedAt"=NOW() WHERE "novelId"=$1`,[old.novelId]);
    await connection.query(`UPDATE "ChapterTemplate" SET "name"=$2,"eyebrowPattern"=$3,"titlePattern"=$4,"showImage"=$5,"headerImageAssetId"=$6,"imageWidth"=$7,"imageAlign"=$8,"imagePosition"=$9,"imageSpacing"=$10,"labelAlign"=$11,"labelSize"=$12,"labelWeight"=$13,"labelFont"=$14,"labelSpacing"=$15,"titleAlign"=$16,"titleSize"=$17,"titleWeight"=$18,"titleFont"=$19,"titleSpacing"=$20,"showDivider"=$21,"dividerWidth"=$22,"dividerThickness"=$23,"headerPaddingTop"=$24,"headerPaddingBottom"=$25,"isDefault"=CASE WHEN $26 THEN true ELSE "isDefault" END,"updatedAt"=NOW() WHERE "id"=$1`,[templateId,name,eyebrowPattern,titlePattern,showImage,headerImageAssetId,imageWidth,imageAlign,imagePosition,imageSpacing,labelAlign,labelSize,labelWeight,labelFont,labelSpacing,titleAlign,titleSize,titleWeight,titleFont,titleSpacing,showDivider,dividerWidth,dividerThickness,headerPaddingTop,headerPaddingBottom,body.makeDefault===true]);
    if(body.applyToUnassigned===true)await connection.query(`UPDATE "Chapter" SET "templateId"=$2,"updatedAt"=NOW() WHERE "novelId"=$1 AND "templateId" IS NULL`,[old.novelId,templateId]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[old.novelId]);
    await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  return NextResponse.json({id:templateId,...values,isDefault:body.makeDefault===true||old.isDefault,headerImageUrl:headerImageAssetId?`/api/assets/${headerImageAssetId}`:null});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{templateId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {templateId}=await params;
  const current=await query<{novelId:string;isDefault:boolean}>(`SELECT t."novelId",t."isDefault" FROM "ChapterTemplate" t JOIN "Novel" n ON n."id"=t."novelId" WHERE t."id"=$1 AND n."userId"=$2`,[templateId,user.id]);
  if(!current.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  if(current.rows[0].isDefault)return NextResponse.json({error:"Choose another default template before deleting this one."},{status:409});
  await query(`DELETE FROM "ChapterTemplate" WHERE "id"=$1`,[templateId]);await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[current.rows[0].novelId]);return NextResponse.json({ok:true});
}
