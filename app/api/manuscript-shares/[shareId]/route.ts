import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function DELETE(request:NextRequest,{params}:{params:Promise<{shareId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {shareId}=await params;
  const result=await query<{id:string}>(`
    DELETE FROM "ManuscriptShare" s
    USING "Novel" n
    WHERE s."id"=$1 AND s."novelId"=n."id" AND n."userId"=$2
    RETURNING s."id"
  `,[shareId,user.id]);
  if(!result.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json({ok:true});
}
