ALTER TABLE "StickyNote" ADD COLUMN "anchorId" TEXT, ADD COLUMN "anchorQuote" TEXT;
CREATE INDEX "StickyNote_anchorId_idx" ON "StickyNote"("anchorId");
