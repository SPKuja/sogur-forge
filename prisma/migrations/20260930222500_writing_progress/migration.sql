CREATE TABLE "WritingPreference" (
  "userId" TEXT NOT NULL,
  "dailyWordTarget" INTEGER NOT NULL DEFAULT 1000,
  "weeklyWordTarget" INTEGER NOT NULL DEFAULT 5000,
  "monthlyWordTarget" INTEGER NOT NULL DEFAULT 20000,
  "showEditorGoal" BOOLEAN NOT NULL DEFAULT true,
  "weeklyRoundupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WritingPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "WritingDay" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "novelId" TEXT NOT NULL,
  "chapterId" TEXT NOT NULL,
  "chapterTitle" TEXT NOT NULL DEFAULT '',
  "day" TEXT NOT NULL,
  "startWords" INTEGER NOT NULL,
  "endWords" INTEGER NOT NULL,
  "firstActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WritingDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WritingDay_userId_chapterId_day_key" ON "WritingDay"("userId","chapterId","day");
CREATE INDEX "WritingDay_userId_day_idx" ON "WritingDay"("userId","day");
CREATE INDEX "WritingDay_novelId_day_idx" ON "WritingDay"("novelId","day");

ALTER TABLE "WritingPreference" ADD CONSTRAINT "WritingPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingDay" ADD CONSTRAINT "WritingDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WritingDay" ADD CONSTRAINT "WritingDay_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
