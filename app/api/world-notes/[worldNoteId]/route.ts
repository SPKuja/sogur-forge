import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const limits={name:180,aliases:1200,category:120,summary:12000,details:30000,significance:16000,notes:24000} as const;
type Field=keyof typeof limits;
async function owned(id:string,userId:string){
  return (await query<{novelId:string}>(`SELECT w."novelId" FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE w."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{worldNoteId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId}=await params,owner=await owned(worldNoteId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),values:Record<Field,string>={} as Record<Field,string>;
  (Object.keys(limits) as Field[]).forEach(field=>values[field]=String(body[field]??"").slice(0,limits[field]));
  values.name=values.name.trim()||"Unnamed World Note";values.category=values.category.trim()||"Lore";
  await query(`UPDATE "WorldNote" SET "name"=$2,"aliases"=$3,"category"=$4,"summary"=$5,"details"=$6,"significance"=$7,"notes"=$8,"updatedAt"=NOW() WHERE "id"=$1`,[worldNoteId,values.name,values.aliases,values.category,values.summary,values.details,values.significance,values.notes]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true,name:values.name,category:values.category});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{worldNoteId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {worldNoteId}=await params,owner=await owned(worldNoteId,user.id);
  if(!owner)return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "WorldNote" WHERE "id"=$1`,[worldNoteId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[owner.novelId]);
  return NextResponse.json({ok:true});
}
