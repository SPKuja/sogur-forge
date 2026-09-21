import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import Library from "./Library";
import {CURRENT_RELEASE,CURRENT_VERSION} from "@/lib/releases";
export const dynamic = "force-dynamic";
export default async function WorkspacePage(){
 const user=await currentUser(); if(!user) redirect("/");
 const seen=await query<{lastSeenVersion:string|null}>(`SELECT "lastSeenVersion" FROM "User" WHERE "id"=$1`,[user.id]);
 const result=await query<{id:string;title:string;description:string;updatedAt:Date;wordCount:string;chapterCount:string}>(`SELECT n."id",n."title",n."description",n."updatedAt",COALESCE(SUM(array_length(regexp_split_to_array(NULLIF(trim(c."content"),''),'\\s+'),1)),0)::text AS "wordCount",COUNT(c."id")::text AS "chapterCount" FROM "Novel" n LEFT JOIN "Chapter" c ON c."novelId"=n."id" WHERE n."userId"=$1 GROUP BY n."id" ORDER BY n."updatedAt" DESC`,[user.id]);
 return <Library username={user.username} role={user.role} novels={result.rows.map(n=>({...n,updatedAt:n.updatedAt.toISOString(),wordCount:Number(n.wordCount),chapterCount:Number(n.chapterCount)}))} release={CURRENT_RELEASE} showWhatsNew={seen.rows[0]?.lastSeenVersion!==CURRENT_VERSION}/>;
}