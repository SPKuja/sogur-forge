import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const TYPES=new Set(["LIVES_HERE","BORN_HERE","RULES","WORKS_HERE","VISITS","ASSOCIATED"]);
async function owned(userId:string,locationId:string,linkId:string){
  return (await query<{id:string}>(`SELECT link."id" FROM "LocationCharacterLink" link JOIN "Location" l ON l."id"=link."locationId" JOIN "Novel" n ON n."id"=l."novelId" WHERE link."id"=$1 AND link."locationId"=$2 AND n."userId"=$3`,[linkId,locationId,userId])).rows[0];
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{locationId:string;linkId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId,linkId}=await params;
  if(!await owned(user.id,locationId,linkId))return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),rawType=String(body.type||"ASSOCIATED"),type=TYPES.has(rawType)?rawType:"ASSOCIATED",notes=String(body.notes||"").slice(0,12000);
  await query(`UPDATE "LocationCharacterLink" SET "type"=$2,"notes"=$3,"updatedAt"=NOW() WHERE "id"=$1`,[linkId,type,notes]);
  return NextResponse.json({ok:true});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{locationId:string;linkId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {locationId,linkId}=await params;
  if(!await owned(user.id,locationId,linkId))return NextResponse.json({error:"Not found"},{status:404});
  await query(`DELETE FROM "LocationCharacterLink" WHERE "id"=$1`,[linkId]);
  return NextResponse.json({ok:true});
}
