CREATE TABLE "CharacterRelationship" (
  "id" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharacterRelationship_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CharacterRelationship_novelId_sourceId_targetId_type_key" ON "CharacterRelationship"("novelId","sourceId","targetId","type");
CREATE INDEX "CharacterRelationship_novelId_idx" ON "CharacterRelationship"("novelId");
CREATE INDEX "CharacterRelationship_sourceId_idx" ON "CharacterRelationship"("sourceId");
CREATE INDEX "CharacterRelationship_targetId_idx" ON "CharacterRelationship"("targetId");
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
