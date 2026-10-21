-- 작성 전용. 승인된 별도 DB 적용 절차 전 실행 금지.
-- cuid()와 @updatedAt은 Prisma가 생성한다(기존 모델과 동일).
CREATE TABLE "JeonseChecklist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "addressKey" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JeonseChecklist_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JeonseChecklist_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JeonseChecklist_userId_addressKey_key" ON "JeonseChecklist"("userId", "addressKey");
CREATE INDEX "JeonseChecklist_userId_idx" ON "JeonseChecklist"("userId");
