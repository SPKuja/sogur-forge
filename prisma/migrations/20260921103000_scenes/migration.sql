CREATE TABLE "Scene" (
  "id" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "povCharacterId" TEXT,
  "title" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "goal" TEXT NOT NULL DEFAULT '',
  "conflict" TEXT NOT NULL DEFAULT '',
  "outcome" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Scene_chapterId_position_key" ON "Scene"("chapterId","position");
CREATE INDEX "Scene_chapterId_idx" ON "Scene"("chapterId");
CREATE INDEX "Scene_povCharacterId_idx" ON "Scene"("povCharacterId");

ALTER TABLE "Scene" ADD CONSTRAINT "Scene_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Scene" ADD CONSTRAINT "Scene_povCharacterId_fkey"
  FOREIGN KEY ("povCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
