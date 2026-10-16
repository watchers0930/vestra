-- VESTRA 비회원 등기감시 — role 컬럼 추가 (2026-10-16)
-- 역할(owner 소유자 / tenant 임차인) 저장. 추가 전용, nullable(레거시 null 허용).
ALTER TABLE "GuestMonitoring" ADD COLUMN IF NOT EXISTS "role" TEXT;
