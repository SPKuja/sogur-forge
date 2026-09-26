CREATE TABLE "WorldNote" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'New World Note',
  "aliases" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'Lore',
  "summary" TEXT NOT NULL DEFAULT '',
  "details" TEXT NOT NULL DEFAULT '',
  "significance" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldNoteImage" (
  "id" TEXT NOT NULL,
  "worldNoteId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldNoteImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldNoteCharacterLink" (
  "id" TEXT NOT NULL,
  "worldNoteId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Associated',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldNoteCharacterLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldNoteLocationLink" (
  "id" TEXT NOT NULL,
  "worldNoteId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Associated',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldNoteLocationLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldNoteRelation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Related',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldNoteRelation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorldNote_novelId_position_idx" ON "WorldNote"("novelId","position");
CREATE INDEX "WorldNote_novelId_category_idx" ON "WorldNote"("novelId","category");
CREATE INDEX "WorldNote_novelId_updatedAt_idx" ON "WorldNote"("novelId","updatedAt");
CREATE UNIQUE INDEX "WorldNoteImage_worldNoteId_assetId_key" ON "WorldNoteImage"("worldNoteId","assetId");
CREATE INDEX "WorldNoteImage_worldNoteId_position_idx" ON "WorldNoteImage"("worldNoteId","position");
CREATE INDEX "WorldNoteImage_assetId_idx" ON "WorldNoteImage"("assetId");
CREATE UNIQUE INDEX "WorldNoteCharacterLink_worldNoteId_characterId_key" ON "WorldNoteCharacterLink"("worldNoteId","characterId");
CREATE INDEX "WorldNoteCharacterLink_worldNoteId_idx" ON "WorldNoteCharacterLink"("worldNoteId");
CREATE INDEX "WorldNoteCharacterLink_characterId_idx" ON "WorldNoteCharacterLink"("characterId");
CREATE UNIQUE INDEX "WorldNoteLocationLink_worldNoteId_locationId_key" ON "WorldNoteLocationLink"("worldNoteId","locationId");
CREATE INDEX "WorldNoteLocationLink_worldNoteId_idx" ON "WorldNoteLocationLink"("worldNoteId");
CREATE INDEX "WorldNoteLocationLink_locationId_idx" ON "WorldNoteLocationLink"("locationId");
CREATE UNIQUE INDEX "WorldNoteRelation_sourceId_targetId_key" ON "WorldNoteRelation"("sourceId","targetId");
CREATE INDEX "WorldNoteRelation_sourceId_idx" ON "WorldNoteRelation"("sourceId");
CREATE INDEX "WorldNoteRelation_targetId_idx" ON "WorldNoteRelation"("targetId");

ALTER TABLE "WorldNote" ADD CONSTRAINT "WorldNote_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteImage" ADD CONSTRAINT "WorldNoteImage_worldNoteId_fkey" FOREIGN KEY ("worldNoteId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteImage" ADD CONSTRAINT "WorldNoteImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteCharacterLink" ADD CONSTRAINT "WorldNoteCharacterLink_worldNoteId_fkey" FOREIGN KEY ("worldNoteId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteCharacterLink" ADD CONSTRAINT "WorldNoteCharacterLink_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteLocationLink" ADD CONSTRAINT "WorldNoteLocationLink_worldNoteId_fkey" FOREIGN KEY ("worldNoteId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteLocationLink" ADD CONSTRAINT "WorldNoteLocationLink_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteRelation" ADD CONSTRAINT "WorldNoteRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldNoteRelation" ADD CONSTRAINT "WorldNoteRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
