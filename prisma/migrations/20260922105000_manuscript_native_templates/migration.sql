ALTER TABLE "Chapter" ADD COLUMN "templateSeededAt" TIMESTAMP(3);
ALTER TABLE "ChapterTemplate" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
