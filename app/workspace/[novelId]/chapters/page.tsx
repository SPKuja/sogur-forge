import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import ChapterManager from "./ChapterManager";
import type {ChapterTemplateDesign} from "@/lib/chapter-template";
export const dynamic="force-dynamic";
type ChapterRow={id:string;partId:string|null;title:string;content:string;summary:string;status:string;position:number;templateId:string|null;headerImageAssetId:string|null};
export default async function Page({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);if(!novel.rows[0])notFound();
  const [chapters,parts,templates]=await Promise.all([
    query<ChapterRow>(`SELECT "id","partId","title","content","summary","status","position","templateId","headerImageAssetId" FROM "Chapter" WHERE "novelId"=$1 ORDER BY "position"`,[novelId]),
    query<{id:string;title:string;position:number}>(`SELECT "id","title","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,[novelId]),
    query<ChapterTemplateDesign>(`SELECT "name","isDefault","eyebrowPattern","titlePattern","showImage","headerImageAssetId","imageWidth","imageAlign","imagePosition","imageSpacing","labelAlign","labelSize","labelWeight","labelFont","labelSpacing","titleAlign","titleSize","titleWeight","titleFont","titleSpacing","showDivider","dividerWidth","dividerThickness","headerPaddingTop","headerPaddingBottom","labelColor","labelCase","titleColor","titleCase" FROM "ChapterTemplate" WHERE "novelId"=$1 ORDER BY "isDefault" DESC,"createdAt"`,[novelId])
  ]);
  return <ChapterManager username={user.username} novel={novel.rows[0]} initialChapters={chapters.rows} parts={parts.rows} initialTemplates={templates.rows.map(t=>({...t,headerImageUrl:t.headerImageAssetId?`/api/assets/${t.headerImageAssetId}`:null}))}/>;
}
