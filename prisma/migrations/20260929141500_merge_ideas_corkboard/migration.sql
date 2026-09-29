ALTER TABLE "StickyNote"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'NOTE',
  ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Idea',
  ADD COLUMN "tags" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'INBOX';

UPDATE "StickyNote"
SET
  "kind" = CASE WHEN "boardId" IS NOT NULL THEN 'IDEA' ELSE 'NOTE' END,
  "title" = CASE
    WHEN "boardId" IS NOT NULL THEN LEFT(COALESCE(NULLIF(split_part("body", E'\n', 1), ''), 'Untitled Idea'), 120)
    ELSE ''
  END;

CREATE TABLE "IdeaBoardPlacement" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'yellow',
  "positionX" INTEGER NOT NULL DEFAULT 40,
  "positionY" INTEGER NOT NULL DEFAULT 40,
  "width" INTEGER NOT NULL DEFAULT 240,
  "height" INTEGER NOT NULL DEFAULT 190,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaBoardPlacement_pkey" PRIMARY KEY ("id")
);

INSERT INTO "IdeaBoardPlacement" ("id","ideaId","boardId","color","positionX","positionY","width","height","createdAt","updatedAt")
SELECT md5("id" || ':' || "boardId"),"id","boardId","color","positionX","positionY","width","height","createdAt","updatedAt"
FROM "StickyNote"
WHERE "boardId" IS NOT NULL;

UPDATE "StickyNote" SET "boardId"=NULL WHERE "kind"='IDEA';

CREATE TABLE "IdeaImage" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdeaAudio" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL DEFAULT 'Voice note',
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaAudio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdeaCharacterLink" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaCharacterLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdeaLocationLink" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaLocationLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdeaWorldNoteLink" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "worldNoteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdeaWorldNoteLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdeaBoardPlacement_ideaId_boardId_key" ON "IdeaBoardPlacement"("ideaId","boardId");
CREATE INDEX "IdeaBoardPlacement_boardId_idx" ON "IdeaBoardPlacement"("boardId");
CREATE INDEX "IdeaBoardPlacement_ideaId_idx" ON "IdeaBoardPlacement"("ideaId");
CREATE UNIQUE INDEX "IdeaImage_ideaId_assetId_key" ON "IdeaImage"("ideaId","assetId");
CREATE INDEX "IdeaImage_ideaId_position_idx" ON "IdeaImage"("ideaId","position");
CREATE INDEX "IdeaImage_assetId_idx" ON "IdeaImage"("assetId");
CREATE UNIQUE INDEX "IdeaAudio_storedName_key" ON "IdeaAudio"("storedName");
CREATE INDEX "IdeaAudio_ideaId_createdAt_idx" ON "IdeaAudio"("ideaId","createdAt");
CREATE UNIQUE INDEX "IdeaCharacterLink_ideaId_characterId_key" ON "IdeaCharacterLink"("ideaId","characterId");
CREATE INDEX "IdeaCharacterLink_ideaId_idx" ON "IdeaCharacterLink"("ideaId");
CREATE INDEX "IdeaCharacterLink_characterId_idx" ON "IdeaCharacterLink"("characterId");
CREATE UNIQUE INDEX "IdeaLocationLink_ideaId_locationId_key" ON "IdeaLocationLink"("ideaId","locationId");
CREATE INDEX "IdeaLocationLink_ideaId_idx" ON "IdeaLocationLink"("ideaId");
CREATE INDEX "IdeaLocationLink_locationId_idx" ON "IdeaLocationLink"("locationId");
CREATE UNIQUE INDEX "IdeaWorldNoteLink_ideaId_worldNoteId_key" ON "IdeaWorldNoteLink"("ideaId","worldNoteId");
CREATE INDEX "IdeaWorldNoteLink_ideaId_idx" ON "IdeaWorldNoteLink"("ideaId");
CREATE INDEX "IdeaWorldNoteLink_worldNoteId_idx" ON "IdeaWorldNoteLink"("worldNoteId");
CREATE INDEX "StickyNote_novelId_kind_updatedAt_idx" ON "StickyNote"("novelId","kind","updatedAt");
CREATE INDEX "StickyNote_novelId_status_idx" ON "StickyNote"("novelId","status");

ALTER TABLE "IdeaBoardPlacement" ADD CONSTRAINT "IdeaBoardPlacement_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "StickyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaBoardPlacement" ADD CONSTRAINT "IdeaBoardPlacement_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CorkBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaImage" ADD CONSTRAINT "IdeaImage_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "StickyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaImage" ADD CONSTRAINT "IdeaImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaAudio" ADD CONSTRAINT "IdeaAudio_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "StickyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaCharacterLink" ADD CONSTRAINT "IdeaCharacterLink_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "StickyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaCharacterLink" ADD CONSTRAINT "IdeaCharacterLink_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaLocationLink" ADD CONSTRAINT "IdeaLocationLink_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "StickyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaLocationLink" ADD CONSTRAINT "IdeaLocationLink_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaWorldNoteLink" ADD CONSTRAINT "IdeaWorldNoteLink_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "StickyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaWorldNoteLink" ADD CONSTRAINT "IdeaWorldNoteLink_worldNoteId_fkey" FOREIGN KEY ("worldNoteId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
