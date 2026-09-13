-- 등기감시 실행 로그 테이블 신설 (프리체크 실행 이력)
-- 생성: 2026-09-14 / P0-7 관련 아님, 등기감시 UX 개선
-- 적용 방법: 운영 DB(Neon)에 대장 승인 후 1회 실행.
-- Prisma migrate diff로 생성한 표준 DDL과 동일 (재실행 안전을 위해 IF NOT EXISTS 추가).

-- CreateTable
CREATE TABLE IF NOT EXISTS "MonitoringCheckLog" (
    "id" TEXT NOT NULL,
    "monitoredPropertyId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "MonitoringCheckLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (물건별 최신순 조회용)
CREATE INDEX IF NOT EXISTS "MonitoringCheckLog_monitoredPropertyId_checkedAt_idx"
    ON "MonitoringCheckLog"("monitoredPropertyId", "checkedAt" DESC);

-- CreateIndex (90일 초과분 일괄 정리 deleteMany 인덱스용)
CREATE INDEX IF NOT EXISTS "MonitoringCheckLog_checkedAt_idx"
    ON "MonitoringCheckLog"("checkedAt");

-- AddForeignKey (중복 방지: 제약이 없을 때만 추가)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MonitoringCheckLog_monitoredPropertyId_fkey'
    ) THEN
        ALTER TABLE "MonitoringCheckLog"
            ADD CONSTRAINT "MonitoringCheckLog_monitoredPropertyId_fkey"
            FOREIGN KEY ("monitoredPropertyId") REFERENCES "MonitoredProperty"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
