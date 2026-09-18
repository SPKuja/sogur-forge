import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {buildManuscriptExport,type ExportOptions} from "@/lib/export/manuscript";

const defaults:ExportOptions={titlePage:true,tableOfContents:true,partHeadings:true,chapterTitles:true,images:true};

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  let body:{novelId?:string;chapterIds?:string[];options?:Partial<ExportOptions>};
  try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
  if(!body.novelId||!Array.isArray(body.chapterIds))return NextResponse.json({error:"Novel and chapter selection are required"},{status:400});
  const options={...defaults,...body.options};
  const manuscript=await buildManuscriptExport(user.id,body.novelId,body.chapterIds.map(String),options);
  if(!manuscript)return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json(manuscript);
}
