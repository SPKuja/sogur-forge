import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const limits={name:160,aliases:1000,role:160,pronouns:100,age:100,description:12000,appearance:12000,personality:12000,background:20000,goals:12000,conflict:12000,arc:16000,notes:20000} as const;
type Field=keyof typeof limits;

async function owned(id:string,userId:string){
  return (await query<{novelId:string}>(`SELECT c."novelId" FROM "Character" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{characterId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {characterId}=await params,owner=await owned(characterId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),values:Record<Field,string>={} as Record<Field,string>;
  (Object.keys(limits) as Field[]).forEach(field=>values[field]=String(body[field]??"").slice(0,limits[field]));
  values.name=values.name.trim()||"Unnamed Character";
  await query(`UPDATE "Character" SET "name"=$2,"aliases"=$3,"role"=$4,"pronouns"=$5,"age"=$6,"description"=$7,"appearance"=$8,"personality"=$9,"background"=$10,"goals"=$11,"conflict"=$12,"arc"=$13,"notes"=$14,"updatedAt"=NOW() WHERE "id"=$1`,[characterId,values.name,values.aliases,values.role,values.pronouns,values.age,values.description,values.appearance,values.personality,values.background,values.goals,values.conflict,values.arc,values.notes]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true,name:values.name});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{characterId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {characterId}=await params,owner=await owned(characterId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "Character" WHERE "id"=$1`,[characterId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true});
}
