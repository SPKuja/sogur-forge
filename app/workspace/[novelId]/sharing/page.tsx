import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {decryptManuscriptShareToken,manuscriptSharePath} from "@/lib/manuscript-share";
import {emailConfigured} from "@/lib/email";
import {manuscriptChapterOrder} from "@/lib/manuscript-order";
import ShareManager from "./ShareManager";

export const dynamic="force-dynamic";

type ShareRow={
  id:string;tokenEncrypted:string;label:string;recipientEmail:string;scope:string;expiresAt:Date|null;
  revokedAt:Date|null;lastViewedAt:Date|null;viewCount:number;createdAt:Date;updatedAt:Date;chapterIds:string[];
};

export default async function SharingPage({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params;
  const novel=(await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id])).rows[0];
  if(!novel)notFound();

  const [parts,chapters,shares,emailEnabled]=await Promise.all([
    query<{id:string;position:number}>(`SELECT "id","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,[novelId]),
    query<{id:string;title:string;kind:string;pageType:string|null;partTitle:string|null;position:number}>(`
      SELECT c."id",c."title",c."kind",c."pageType",p."title" AS "partTitle",c."position"
      FROM "Chapter" c LEFT JOIN "Part" p ON p."id"=c."partId"
      WHERE c."novelId"=$1 ORDER BY c."position"
    `,[novelId]),
    query<ShareRow>(`
      SELECT s.*,COALESCE(array_agg(sc."chapterId") FILTER (WHERE sc."chapterId" IS NOT NULL),'{}') AS "chapterIds"
      FROM "ManuscriptShare" s
      LEFT JOIN "ManuscriptShareChapter" sc ON sc."shareId"=s."id"
      WHERE s."novelId"=$1
      GROUP BY s."id"
      ORDER BY s."createdAt" DESC
    `,[novelId]),
    emailConfigured()
  ]);

  const initialShares=shares.rows.map(share=>{
    let path:string|null=null;
    try{path=manuscriptSharePath(decryptManuscriptShareToken(share.tokenEncrypted))}catch{}
    return {
      id:share.id,label:share.label,recipientEmail:share.recipientEmail,scope:share.scope,
      expiresAt:share.expiresAt?.toISOString()??null,revokedAt:share.revokedAt?.toISOString()??null,
      lastViewedAt:share.lastViewedAt?.toISOString()??null,viewCount:share.viewCount,
      createdAt:share.createdAt.toISOString(),updatedAt:share.updatedAt.toISOString(),
      chapterIds:share.chapterIds||[],path
    };
  });

  const orderedChapters=manuscriptChapterOrder(chapters.rows,parts.rows);
  return <ShareManager username={user.username} novel={novel} chapters={orderedChapters} initialShares={initialShares} emailEnabled={emailEnabled}/>;
}
