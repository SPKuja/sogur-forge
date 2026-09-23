CREATE TABLE "NovelLayout" (
  "novelId" TEXT NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NovelLayout_pkey" PRIMARY KEY ("novelId")
);

CREATE TABLE "ManuscriptViewPreference" (
  "userId" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "displayMode" TEXT NOT NULL DEFAULT 'CONTINUOUS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManuscriptViewPreference_pkey" PRIMARY KEY ("userId","novelId")
);

CREATE INDEX "ManuscriptViewPreference_novelId_idx" ON "ManuscriptViewPreference"("novelId");

ALTER TABLE "NovelLayout" ADD CONSTRAINT "NovelLayout_novelId_fkey"
  FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManuscriptViewPreference" ADD CONSTRAINT "ManuscriptViewPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManuscriptViewPreference" ADD CONSTRAINT "ManuscriptViewPreference_novelId_fkey"
  FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
