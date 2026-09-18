import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {CURRENT_VERSION} from "@/lib/releases";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  await query(`UPDATE "User" SET "lastSeenVersion"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[user.id,CURRENT_VERSION]);
  return NextResponse.json({ok:true,version:CURRENT_VERSION});
}
