-- 감시 실행 로그에 위험도(riskLevel) 컬럼 추가 — 달력 5색 표시용
-- 생성: 2026-09-14 / 등기감시 실행 내역 달력(회색/파랑/노랑/주황/빨강)
-- 적용: 운영 DB(Neon)에 대장 승인 후 1회 실행. nullable이라 기존 행·구버전 코드 무해.

ALTER TABLE "MonitoringCheckLog" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT;
