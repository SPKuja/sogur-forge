CREATE TABLE "CharacterImage" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharacterImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CharacterImage_characterId_assetId_key" ON "CharacterImage"("characterId","assetId");
CREATE INDEX "CharacterImage_characterId_position_idx" ON "CharacterImage"("characterId","position");
CREATE INDEX "CharacterImage_assetId_idx" ON "CharacterImage"("assetId");
ALTER TABLE "CharacterImage" ADD CONSTRAINT "CharacterImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterImage" ADD CONSTRAINT "CharacterImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
