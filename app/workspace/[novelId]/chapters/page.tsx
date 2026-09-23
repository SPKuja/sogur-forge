import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import ChapterManager from "./ChapterManager";
import {normaliseChapterTemplate} from "@/lib/chapter-template";
import {materialiseLegacyTemplateChapters} from "@/lib/template-materialisation";
import ManuscriptLayoutProvider from "../../ManuscriptLayoutProvider";
import {getManuscriptLayoutBundle} from "@/lib/manuscript-layout-server";

export const dynamic="force-dynamic";

type ChapterRow={
  id:string;
  partId:string|null;
  title:string;
  kind:string;
  pageType:string|null;
  content:string;
  summary:string;
  status:string;
  position:number;
  templateId:string|null;
  headerImageAssetId:string|null;
};

export default async function Page({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();
  if(!user)redirect("/");

  const {novelId}=await params;
  const novel=await query<{id:string;title:string}>(
    `SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,
    [novelId,user.id]
  );
  if(!novel.rows[0])notFound();

  await materialiseLegacyTemplateChapters(novelId,user.id);
  const layoutBundle=await getManuscriptLayoutBundle(user.id,novelId);
  if(!layoutBundle)notFound();

  const [chapters,parts,templates]=await Promise.all([
    query<ChapterRow>(
      `SELECT "id","partId","title","kind","pageType","content","summary","status","position","templateId","headerImageAssetId"
       FROM "Chapter"
       WHERE "novelId"=$1
       ORDER BY "position"`,
      [novelId]
    ),
    query<{id:string;title:string;position:number}>(
      `SELECT "id","title","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,
      [novelId]
    ),
    query<Record<string,unknown>&{id:string;name:string;isDefault:boolean}>(
      `SELECT * FROM "ChapterTemplate" WHERE "novelId"=$1 ORDER BY "isDefault" DESC,"createdAt"`,
      [novelId]
    )
  ]);

  return <ManuscriptLayoutProvider novelId={novelId} initialLayout={layoutBundle.layout} initialDisplayMode={layoutBundle.displayMode}><ChapterManager
    username={user.username}
    novel={novel.rows[0]}
    initialChapters={chapters.rows}
    parts={parts.rows}
    initialTemplates={templates.rows.map(normaliseChapterTemplate)}
  /></ManuscriptLayoutProvider>;
}
