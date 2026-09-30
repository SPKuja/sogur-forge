import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import Library from "./Library";
import {CURRENT_RELEASE,CURRENT_VERSION} from "@/lib/releases";
import {countManuscriptWords} from "@/lib/writing-progress";
export const dynamic = "force-dynamic";
export default async function WorkspacePage(){
 const user=await currentUser(); if(!user) redirect("/");
 const seen=await query<{lastSeenVersion:string|null}>(`SELECT "lastSeenVersion" FROM "User" WHERE "id"=$1`,[user.id]);
 const [novels,chapters]=await Promise.all([
  query<{id:string;title:string;description:string;updatedAt:Date}>(`SELECT "id","title","description","updatedAt" FROM "Novel" WHERE "userId"=$1 ORDER BY "updatedAt" DESC`,[user.id]),
  query<{novelId:string;content:string;kind:string}>(`SELECT c."novelId",c."content",c."kind" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1`,[user.id])
 ]);
 const totals=new Map<string,{wordCount:number;chapterCount:number}>();
 for(const chapter of chapters.rows){const current=totals.get(chapter.novelId)||{wordCount:0,chapterCount:0};current.wordCount+=countManuscriptWords(chapter.content);if(chapter.kind!=="PAGE")current.chapterCount++;totals.set(chapter.novelId,current)}
 return <Library username={user.username} role={user.role} novels={novels.rows.map(n=>({...n,updatedAt:n.updatedAt.toISOString(),wordCount:totals.get(n.id)?.wordCount||0,chapterCount:totals.get(n.id)?.chapterCount||0}))} release={CURRENT_RELEASE} showWhatsNew={seen.rows[0]?.lastSeenVersion!==CURRENT_VERSION}/>;
}