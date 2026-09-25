CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL DEFAULT 'New Location',
  "aliases" TEXT NOT NULL DEFAULT '',
  "type" TEXT NOT NULL DEFAULT '',
  "region" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "atmosphere" TEXT NOT NULL DEFAULT '',
  "history" TEXT NOT NULL DEFAULT '',
  "significance" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocationImage" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocationCharacterLink" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'ASSOCIATED',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationCharacterLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Location_novelId_position_idx" ON "Location"("novelId","position");
CREATE INDEX "Location_novelId_updatedAt_idx" ON "Location"("novelId","updatedAt");
CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");
CREATE UNIQUE INDEX "LocationImage_locationId_assetId_key" ON "LocationImage"("locationId","assetId");
CREATE INDEX "LocationImage_locationId_position_idx" ON "LocationImage"("locationId","position");
CREATE INDEX "LocationImage_assetId_idx" ON "LocationImage"("assetId");
CREATE UNIQUE INDEX "LocationCharacterLink_locationId_characterId_key" ON "LocationCharacterLink"("locationId","characterId");
CREATE INDEX "LocationCharacterLink_locationId_idx" ON "LocationCharacterLink"("locationId");
CREATE INDEX "LocationCharacterLink_characterId_idx" ON "LocationCharacterLink"("characterId");

ALTER TABLE "Location" ADD CONSTRAINT "Location_novelId_fkey"
  FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LocationImage" ADD CONSTRAINT "LocationImage_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationImage" ADD CONSTRAINT "LocationImage_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationCharacterLink" ADD CONSTRAINT "LocationCharacterLink_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationCharacterLink" ADD CONSTRAINT "LocationCharacterLink_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
