CREATE TABLE "ManuscriptShare" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenEncrypted" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "recipientEmail" TEXT NOT NULL DEFAULT '',
  "scope" TEXT NOT NULL DEFAULT 'ALL',
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3),
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManuscriptShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManuscriptShareChapter" (
  "shareId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  CONSTRAINT "ManuscriptShareChapter_pkey" PRIMARY KEY ("shareId","chapterId")
);

CREATE UNIQUE INDEX "ManuscriptShare_tokenHash_key" ON "ManuscriptShare"("tokenHash");
CREATE INDEX "ManuscriptShare_novelId_revokedAt_idx" ON "ManuscriptShare"("novelId","revokedAt");
CREATE INDEX "ManuscriptShare_expiresAt_idx" ON "ManuscriptShare"("expiresAt");
CREATE INDEX "ManuscriptShareChapter_chapterId_idx" ON "ManuscriptShareChapter"("chapterId");

ALTER TABLE "ManuscriptShare" ADD CONSTRAINT "ManuscriptShare_novelId_fkey"
  FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManuscriptShareChapter" ADD CONSTRAINT "ManuscriptShareChapter_shareId_fkey"
  FOREIGN KEY ("shareId") REFERENCES "ManuscriptShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManuscriptShareChapter" ADD CONSTRAINT "ManuscriptShareChapter_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
