import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import Workspace from "../Workspace";
import {CURRENT_VERSION} from "@/lib/releases";
import {normaliseChapterTemplate} from "@/lib/chapter-template";
import {materialiseLegacyTemplateChapters} from "@/lib/template-materialisation";
import ManuscriptLayoutProvider from "../ManuscriptLayoutProvider";
import {getManuscriptLayoutBundle} from "@/lib/manuscript-layout-server";

export const dynamic="force-dynamic";

type ChapterRow={
  id:string;
  partId:string|null;
  partTitle:string|null;
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

export default async function NovelPage({
  params,
  searchParams
}:{
  params:Promise<{novelId:string}>;
  searchParams:Promise<{chapter?:string}>;
}){
  const user=await currentUser();
  if(!user)redirect("/");

  const {novelId}=await params;
  const {chapter:requestedChapter}=await searchParams;
  const novel=await query<{id:string;title:string}>(
    `SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,
    [novelId,user.id]
  );
  if(!novel.rows[0])notFound();

  await materialiseLegacyTemplateChapters(novelId,user.id);
  const layoutBundle=await getManuscriptLayoutBundle(user.id,novelId);
  if(!layoutBundle)notFound();

  const [chapters,parts,notes,templates]=await Promise.all([
    query<ChapterRow>(
      `SELECT c."id",c."partId",p."title" AS "partTitle",c."title",c."kind",c."pageType",
              c."content",c."summary",c."status",c."position",c."templateId",c."headerImageAssetId"
       FROM "Chapter" c
       LEFT JOIN "Part" p ON p."id"=c."partId"
       WHERE c."novelId"=$1
       ORDER BY c."position"`,
      [novelId]
    ),
    query<{id:string;title:string;position:number}>(
      `SELECT "id","title","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,
      [novelId]
    ),
    query<{id:string;chapterId:string;body:string;color:string;anchorId:string|null;anchorQuote:string|null}>(
      `SELECT "id","chapterId","body","color","anchorId","anchorQuote"
       FROM "StickyNote"
       WHERE "novelId"=$1 AND "chapterId" IS NOT NULL
       ORDER BY "createdAt"`,
      [novelId]
    ),
    query<Record<string,unknown>&{id:string;name:string;isDefault:boolean}>(
      `SELECT * FROM "ChapterTemplate" WHERE "novelId"=$1 ORDER BY "isDefault" DESC,"createdAt"`,
      [novelId]
    )
  ]);

  const initialActiveId=chapters.rows.some(item=>item.id===requestedChapter)
    ? requestedChapter
    : chapters.rows[0]?.id;

  return <ManuscriptLayoutProvider novelId={novelId} initialLayout={layoutBundle.layout} initialDisplayMode={layoutBundle.displayMode}><Workspace
    username={user.username}
    novel={novel.rows[0]}
    initialChapters={chapters.rows}
    initialParts={parts.rows}
    initialNotes={notes.rows}
    initialTemplates={templates.rows.map(normaliseChapterTemplate)}
    initialActiveId={initialActiveId}
    appVersion={CURRENT_VERSION}
  /></ManuscriptLayoutProvider>;
}
