import {randomUUID} from "node:crypto";
import {db} from "@/lib/db";
import {normaliseChapterTemplate,renderChapterTemplateContent} from "@/lib/chapter-template";

type Pending={
  id:string;
  templateId:string;
  title:string;
  content:string;
  summary:string;
  status:string;
  partTitle:string|null;
  novelTitle:string;
};

export async function materialiseLegacyTemplateChapters(novelId:string,userId:string){
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const pending=await connection.query<Pending>(
      `SELECT c."id",c."templateId",c."title",c."content",c."summary",c."status",
              p."title" AS "partTitle",n."title" AS "novelTitle"
       FROM "Chapter" c
       JOIN "Novel" n ON n."id"=c."novelId"
       LEFT JOIN "Part" p ON p."id"=c."partId"
       WHERE c."novelId"=$1
         AND n."userId"=$2
         AND c."kind"='CHAPTER'
         AND c."templateId" IS NOT NULL
         AND c."templateSeededAt" IS NULL
       FOR UPDATE OF c`,
      [novelId,userId]
    );
    if(!pending.rows.length){
      await connection.query("COMMIT");
      return;
    }

    const order=(await connection.query<{id:string;kind:string}>(
      `SELECT "id","kind" FROM "Chapter" WHERE "novelId"=$1 ORDER BY "position","id"`,
      [novelId]
    )).rows;
    let chapterNumber=0;
    const numbers=new Map<string,number>();
    for(const item of order)if(item.kind==="CHAPTER")numbers.set(item.id,++chapterNumber);

    const templates=(await connection.query<Record<string,unknown>&{id:string;name:string;isDefault:boolean}>(
      `SELECT * FROM "ChapterTemplate" WHERE "novelId"=$1`,
      [novelId]
    )).rows;
    const byId=new Map(templates.map(template=>[template.id,normaliseChapterTemplate(template)]));

    for(const chapter of pending.rows){
      const template=byId.get(chapter.templateId);
      if(!template){
        await connection.query(`UPDATE "Chapter" SET "templateSeededAt"=NOW() WHERE "id"=$1`,[chapter.id]);
        continue;
      }
      const seed=renderChapterTemplateContent(template.content,{
        chapterNumber:numbers.get(chapter.id)||1,
        chapterTitle:chapter.title,
        partTitle:chapter.partTitle,
        novelTitle:chapter.novelTitle
      });
      const nextContent=seed+chapter.content;
      await connection.query(
        `INSERT INTO "ChapterRevision" ("id","chapterId","title","content","summary","status","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [randomUUID(),chapter.id,chapter.title,chapter.content,chapter.summary,chapter.status]
      );
      await connection.query(
        `UPDATE "Chapter"
         SET "content"=$2,"templateSeededAt"=NOW(),"headerImageAssetId"=NULL,"updatedAt"=NOW()
         WHERE "id"=$1`,
        [chapter.id,nextContent]
      );
    }
    await connection.query("COMMIT");
  }catch(error){
    await connection.query("ROLLBACK");
    throw error;
  }finally{
    connection.release();
  }
}
