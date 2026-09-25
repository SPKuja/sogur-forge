-- Fold every scene-enabled chapter back into ordinary chapter content before
-- removing the scene layer. The visible manuscript break is deliberately kept
-- as prose so no writing or authored separators are lost.
UPDATE "Chapter" AS chapter
SET
  "content" = aggregated."content",
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT
    "chapterId",
    string_agg(
      "content",
      '<p class="scene-break" data-sogur-scene-break="true">* * *</p>'
      ORDER BY "position", "createdAt"
    ) AS "content"
  FROM "Scene"
  GROUP BY "chapterId"
) AS aggregated
WHERE chapter."id" = aggregated."chapterId";

DROP TABLE "Scene";
