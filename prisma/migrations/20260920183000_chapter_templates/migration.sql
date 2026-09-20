ALTER TABLE "Chapter" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Chapter" ADD COLUMN "headerImageAssetId" TEXT;

CREATE TABLE "ChapterTemplate" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "eyebrowPattern" TEXT NOT NULL DEFAULT 'CHAPTER {{chapter_number}}',
  "titlePattern" TEXT NOT NULL DEFAULT '{{chapter_title}}',
  "showImage" BOOLEAN NOT NULL DEFAULT false,
  "headerImageAssetId" TEXT,
  "imageWidth" INTEGER NOT NULL DEFAULT 100,
  "imageAlign" TEXT NOT NULL DEFAULT 'CENTER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChapterTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Chapter_templateId_idx" ON "Chapter"("templateId");
CREATE INDEX "Chapter_headerImageAssetId_idx" ON "Chapter"("headerImageAssetId");
CREATE INDEX "ChapterTemplate_novelId_updatedAt_idx" ON "ChapterTemplate"("novelId","updatedAt");
CREATE INDEX "ChapterTemplate_headerImageAssetId_idx" ON "ChapterTemplate"("headerImageAssetId");

ALTER TABLE "ChapterTemplate" ADD CONSTRAINT "ChapterTemplate_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterTemplate" ADD CONSTRAINT "ChapterTemplate_headerImageAssetId_fkey" FOREIGN KEY ("headerImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChapterTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_headerImageAssetId_fkey" FOREIGN KEY ("headerImageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
