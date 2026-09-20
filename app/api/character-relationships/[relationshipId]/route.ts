import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

async function owned(id:string,userId:string){
  return (await query<{novelId:string}>(`SELECT r."novelId" FROM "CharacterRelationship" r JOIN "Novel" n ON n."id"=r."novelId" WHERE r."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{relationshipId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {relationshipId}=await params,owner=await owned(relationshipId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),label=String(body.label??"").trim().slice(0,120),notes=String(body.notes??"").slice(0,4000);
  await query(`UPDATE "CharacterRelationship" SET "label"=$2,"notes"=$3,"updatedAt"=NOW() WHERE "id"=$1`,[relationshipId,label,notes]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{relationshipId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {relationshipId}=await params,owner=await owned(relationshipId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "CharacterRelationship" WHERE "id"=$1`,[relationshipId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true});
}
