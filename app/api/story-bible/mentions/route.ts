import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";

type EntityKind="CHARACTER"|"LOCATION"|"WORLD_NOTE";
type EntityRow={name:string;aliases:string;novelId:string};
type ChapterRow={id:string;title:string;kind:string;pageType:string|null;content:string;partTitle:string|null};

function decode(value:string){
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/<\/p\s*>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/\s+/g," ")
    .trim();
}
function aliases(value:string){return [...new Set(value.split(/[,;\n|]+/).map(item=>item.trim()).filter(Boolean))]}
function esc(value:string){return value.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&")}
function snippet(text:string,index:number,length:number){
  const radius=95,start=Math.max(0,index-radius),end=Math.min(text.length,index+length+radius);
  let value=text.slice(start,end).trim();
  if(start>0)value="…"+value;
  if(end<text.length)value+="…";
  return value;
}
async function entity(kind:EntityKind,id:string,userId:string){
  if(kind==="CHARACTER")return (await query<EntityRow>(`SELECT c."name",c."aliases",c."novelId" FROM "Character" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
  if(kind==="LOCATION")return (await query<EntityRow>(`SELECT l."name",l."aliases",l."novelId" FROM "Location" l JOIN "Novel" n ON n."id"=l."novelId" WHERE l."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
  return (await query<EntityRow>(`SELECT w."name",w."aliases",w."novelId" FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE w."id"=$1 AND n."userId"=$2`,[id,userId])).rows[0];
}

export async function GET(request:NextRequest){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const rawKind=String(request.nextUrl.searchParams.get("kind")||"").toUpperCase();
  if(rawKind!=="CHARACTER"&&rawKind!=="LOCATION"&&rawKind!=="WORLD_NOTE")return NextResponse.json({error:"Invalid kind"},{status:400});
  const kind=rawKind as EntityKind,id=String(request.nextUrl.searchParams.get("id")||"");
  const item=await entity(kind,id,user.id);if(!item)return NextResponse.json({error:"Not found"},{status:404});
  const terms=[item.name,...aliases(item.aliases)].map(value=>value.trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
  if(!terms.length)return NextResponse.json({mentions:[],totalOccurrences:0});
  const expression=new RegExp("(?<![\\\\p{L}\\\\p{N}_])(?:"+terms.map(esc).join("|")+")(?![\\\\p{L}\\\\p{N}_])","giu");
  const chapters=await query<ChapterRow>(`SELECT c."id",c."title",c."kind",c."pageType",c."content",p."title" AS "partTitle" FROM "Chapter" c LEFT JOIN "Part" p ON p."id"=c."partId" WHERE c."novelId"=$1 ORDER BY c."position"`,[item.novelId]);
  const mentions=[] as Array<{chapterId:string;title:string;kind:string;pageType:string|null;partTitle:string|null;occurrences:number;snippet:string}>;
  let totalOccurrences=0;
  for(const chapter of chapters.rows){
    const text=decode(chapter.content||"");if(!text)continue;
    expression.lastIndex=0;let match:RegExpExecArray|null,occurrences=0,firstIndex=-1,firstLength=0;
    while((match=expression.exec(text))){occurrences++;if(firstIndex<0){firstIndex=match.index;firstLength=match[0].length}if(match[0].length===0)expression.lastIndex++}
    if(!occurrences)continue;
    totalOccurrences+=occurrences;
    mentions.push({chapterId:chapter.id,title:chapter.title,kind:chapter.kind,pageType:chapter.pageType,partTitle:chapter.partTitle,occurrences,snippet:snippet(text,firstIndex,firstLength)});
  }
  return NextResponse.json({mentions,totalOccurrences});
}
