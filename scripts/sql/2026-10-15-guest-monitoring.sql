-- VESTRA 비회원 등기감시 — 신규 테이블 DDL (2026-10-15)
-- 생성: prisma migrate diff (운영 DB 현재상태 → schema.prisma delta)
-- 성격: 추가 전용(CREATE TABLE/INDEX + FK). 기존 테이블·데이터 미변경. DROP 없음.
-- 적용: 대장 승인 후 수동 적용 (운영 DB는 Prisma Migrate 미관리).
--   npx prisma db execute --file scripts/sql/2026-10-15-guest-monitoring.sql --schema prisma/schema.prisma
-- 되돌리기(필요시): DROP TABLE "GuestMonitoringMessage","GuestVerificationSession","GuestMonitoringCheckLog","GuestMonitoringOrder","GuestMonitoring" CASCADE;
-- ⚠️ t-vestra/운영이 동일 Neon DB 공유 시 양쪽 반영(추가 전용이라 기존 기능 영향 없음).

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuestMonitoring" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestIdentityHash" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "commUniqueNo" TEXT,
    "ownerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "startedAt" TIMESTAMP(3),
    "paidUntil" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "registrySignalStatus" TEXT NOT NULL DEFAULT 'idle',
    "registrySignalDetectedAt" TIMESTAMP(3),
    "registrySignalSummary" TEXT,
    "draftExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestMonitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuestMonitoringOrder" (
    "providerReceipt" TEXT,
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "guestMonitoringId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "productVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerMode" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "appliedPeriodStart" TIMESTAMP(3),
    "appliedPeriodEnd" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestMonitoringOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuestMonitoringCheckLog" (
    "id" TEXT NOT NULL,
    "guestMonitoringId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "riskLevel" TEXT,
    "summary" TEXT,

    CONSTRAINT "GuestMonitoringCheckLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuestVerificationSession" (
    "draftId" TEXT,
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requestNonce" TEXT NOT NULL,
    "providerTxId" TEXT,
    "inputIdentityHash" TEXT NOT NULL,
    "verifiedIdentityHash" TEXT,
    "browserBindingHash" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestVerificationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuestMonitoringMessage" (
    "id" TEXT NOT NULL,
    "guestMonitoringId" TEXT NOT NULL,
    "targetPaidUntil" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channel" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestMonitoringMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoring_guestIdentityHash_idx" ON "GuestMonitoring"("guestIdentityHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoring_status_paidUntil_idx" ON "GuestMonitoring"("status", "paidUntil");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoring_guestIdentityHash_commUniqueNo_idx" ON "GuestMonitoring"("guestIdentityHash", "commUniqueNo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoring_draftExpiresAt_idx" ON "GuestMonitoring"("draftExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuestMonitoringOrder_orderId_key" ON "GuestMonitoringOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuestMonitoringOrder_providerTransactionId_key" ON "GuestMonitoringOrder"("providerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuestMonitoringOrder_idempotencyKey_key" ON "GuestMonitoringOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoringOrder_guestMonitoringId_status_idx" ON "GuestMonitoringOrder"("guestMonitoringId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoringOrder_status_expiresAt_idx" ON "GuestMonitoringOrder"("status", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoringCheckLog_guestMonitoringId_checkedAt_idx" ON "GuestMonitoringCheckLog"("guestMonitoringId", "checkedAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoringCheckLog_checkedAt_idx" ON "GuestMonitoringCheckLog"("checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuestVerificationSession_tokenHash_key" ON "GuestVerificationSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuestVerificationSession_requestNonce_key" ON "GuestVerificationSession"("requestNonce");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestVerificationSession_inputIdentityHash_idx" ON "GuestVerificationSession"("inputIdentityHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestVerificationSession_expiresAt_idx" ON "GuestVerificationSession"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GuestMonitoringMessage_status_nextAttemptAt_idx" ON "GuestMonitoringMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GuestMonitoringMessage_guestMonitoringId_type_targetPaidUnt_key" ON "GuestMonitoringMessage"("guestMonitoringId", "type", "targetPaidUntil");

-- AddForeignKey
ALTER TABLE "GuestMonitoringOrder" ADD CONSTRAINT "GuestMonitoringOrder_guestMonitoringId_fkey" FOREIGN KEY ("guestMonitoringId") REFERENCES "GuestMonitoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestMonitoringCheckLog" ADD CONSTRAINT "GuestMonitoringCheckLog_guestMonitoringId_fkey" FOREIGN KEY ("guestMonitoringId") REFERENCES "GuestMonitoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestMonitoringMessage" ADD CONSTRAINT "GuestMonitoringMessage_guestMonitoringId_fkey" FOREIGN KEY ("guestMonitoringId") REFERENCES "GuestMonitoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

