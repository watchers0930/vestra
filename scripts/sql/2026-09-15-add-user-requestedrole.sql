-- 사업자 전환 신청 시 승인 대기 중인 요청 역할 저장 컬럼
-- 생성: 2026-09-15 / 승인 전엔 role=PERSONAL 유지, 관리자 승인 시 requestedRole로 전환
-- 적용: 운영 DB(Neon)에 대장 승인 후 1회 실행. nullable이라 기존 행·구버전 코드 무해.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "requestedRole" TEXT;
