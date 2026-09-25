import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const limits={name:180,aliases:1200,type:120,region:180,description:16000,atmosphere:16000,history:24000,significance:16000,notes:24000} as const;
type Field=keyof typeof limits;

async function owned(id:string,userId:string){
  return (await query<{novelId:string}>(`SELECT l."novelId" FROM "Location" l JOIN "Novel" n ON n."id"=l."novelId" WHERE l."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
}

async function validParent(locationId:string,novelId:string,parentId:string|null){
  if(!parentId)return true;
  if(parentId===locationId)return false;
  const parent=await query<{id:string}>(`SELECT "id" FROM "Location" WHERE "id"=$1 AND "novelId"=$2`,[parentId,novelId]);
  if(!parent.rows[0])return false;
  const cycle=await query<{id:string}>(`WITH RECURSIVE ancestry AS (
      SELECT "id","parentId" FROM "Location" WHERE "id"=$1
      UNION ALL
      SELECT l."id",l."parentId" FROM "Location" l JOIN ancestry a ON l."id"=a."parentId"
    )
    SELECT "id" FROM ancestry WHERE "id"=$2 LIMIT 1`,[parentId,locationId]);
  return !cycle.rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{locationId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId}=await params,owner=await owned(locationId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),values:Record<Field,string>={} as Record<Field,string>;
  (Object.keys(limits) as Field[]).forEach(field=>values[field]=String(body[field]??"").slice(0,limits[field]));
  values.name=values.name.trim()||"Unnamed Location";
  const parentId=body.parentId?String(body.parentId):null;
  if(!await validParent(locationId,owner.novelId,parentId))return NextResponse.json({error:"That parent would create an invalid location hierarchy."},{status:409});
  await query(`UPDATE "Location" SET "parentId"=$2,"name"=$3,"aliases"=$4,"type"=$5,"region"=$6,"description"=$7,"atmosphere"=$8,"history"=$9,"significance"=$10,"notes"=$11,"updatedAt"=NOW() WHERE "id"=$1`,[locationId,parentId,values.name,values.aliases,values.type,values.region,values.description,values.atmosphere,values.history,values.significance,values.notes]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true,name:values.name,parentId});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{locationId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId}=await params,owner=await owned(locationId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "Location" WHERE "id"=$1`,[locationId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true});
}
