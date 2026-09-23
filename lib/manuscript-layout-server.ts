import {query} from "@/lib/db";
import {DEFAULT_MANUSCRIPT_LAYOUT,normaliseManuscriptDisplayMode,normaliseManuscriptLayout,type ManuscriptLayoutBundle} from "@/lib/manuscript-layout";

export async function getManuscriptLayoutBundle(userId:string,novelId:string):Promise<ManuscriptLayoutBundle|null>{
  const result=await query<{settings:unknown|null;displayMode:string|null}>(
    `SELECT l."settings",p."displayMode"
     FROM "Novel" n
     LEFT JOIN "NovelLayout" l ON l."novelId"=n."id"
     LEFT JOIN "ManuscriptViewPreference" p ON p."novelId"=n."id" AND p."userId"=$2
     WHERE n."id"=$1 AND n."userId"=$2`,
    [novelId,userId]
  );
  if(!result.rows[0])return null;
  return {
    layout:result.rows[0].settings?normaliseManuscriptLayout(result.rows[0].settings):DEFAULT_MANUSCRIPT_LAYOUT,
    displayMode:normaliseManuscriptDisplayMode(result.rows[0].displayMode)
  };
}
