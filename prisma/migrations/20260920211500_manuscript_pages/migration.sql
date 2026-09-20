ALTER TABLE "Chapter"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'CHAPTER',
  ADD COLUMN "pageType" TEXT;

CREATE INDEX "Chapter_novelId_kind_position_idx" ON "Chapter"("novelId","kind","position");
