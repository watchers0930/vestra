-- 무료회원 단건 등기감시 (v5.204.0) 운영 DB 마이그레이션
-- 생성: prisma migrate diff (운영 현재 → 새 스키마). 다른 drift 없음 확인됨.
-- 안전성: ADD COLUMN ... DEFAULT 'subscription'은 기존 레코드를 'subscription'으로 백필(영향 0).
--         paidUntil은 nullable. 신규 테이블/인덱스/FK는 추가만. 기존 데이터 변경 없음.
-- 적용: DIRECT_URL로 psql 실행 또는 Neon 콘솔. 적용 후 `prisma migrate diff`가 empty여야 함.
-- 롤백: DROP TABLE "MemberSingleMonitoringOrder"; DROP INDEX ...source_status_paidUntil_idx;
--       ALTER TABLE "MonitoredProperty" DROP COLUMN "source", DROP COLUMN "paidUntil"; (데이터 손실 없음)

-- AlterTable
ALTER TABLE "MonitoredProperty" ADD COLUMN     "paidUntil" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'subscription';

-- CreateTable
CREATE TABLE "MemberSingleMonitoringOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monitoredPropertyId" TEXT,
    "address" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "productVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerMode" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "providerReceipt" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "appliedPeriodStart" TIMESTAMP(3),
    "appliedPeriodEnd" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberSingleMonitoringOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberSingleMonitoringOrder_orderId_key" ON "MemberSingleMonitoringOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSingleMonitoringOrder_providerTransactionId_key" ON "MemberSingleMonitoringOrder"("providerTransactionId");

-- CreateIndex
CREATE INDEX "MemberSingleMonitoringOrder_userId_status_idx" ON "MemberSingleMonitoringOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "MemberSingleMonitoringOrder_status_expiresAt_idx" ON "MemberSingleMonitoringOrder"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "MemberSingleMonitoringOrder_status_appliedAt_idx" ON "MemberSingleMonitoringOrder"("status", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSingleMonitoringOrder_userId_idempotencyKey_key" ON "MemberSingleMonitoringOrder"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MonitoredProperty_source_status_paidUntil_idx" ON "MonitoredProperty"("source", "status", "paidUntil");

-- AddForeignKey
ALTER TABLE "MemberSingleMonitoringOrder" ADD CONSTRAINT "MemberSingleMonitoringOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSingleMonitoringOrder" ADD CONSTRAINT "MemberSingleMonitoringOrder_monitoredPropertyId_fkey" FOREIGN KEY ("monitoredPropertyId") REFERENCES "MonitoredProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
