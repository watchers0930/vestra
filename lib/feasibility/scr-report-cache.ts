/**
 * SCR 보고서 인메모리 캐시
 *
 * DB 저장 구조 도입 전까지 임시로 사용하는 인메모리 저장소.
 * TTL 24시간, 주기적 정리.
 */

import type { ScrReportData } from "./scr-types";

interface CachedReport {
  data: ScrReportData;
  createdAt: Date;
  /** 보고서 생성자 userId. 로그인 사용자 보고서는 본인만 조회 가능. 게스트는 null. */
  ownerId: string | null;
}

/** 24시간 TTL (밀리초) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** 정리 주기: 1시간마다 */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/** 인메모리 보고서 캐시 */
const reportCache = new Map<string, CachedReport>();

/** 마지막 정리 시각 */
let lastCleanup = Date.now();

/** 만료된 캐시 정리 */
function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [id, entry] of reportCache) {
    if (now - entry.createdAt.getTime() > CACHE_TTL_MS) {
      reportCache.delete(id);
    }
  }
}

/** 보고서 저장 */
export function cacheReport(id: string, data: ScrReportData, ownerId: string | null = null): void {
  cleanupExpired();
  reportCache.set(id, { data, createdAt: new Date(), ownerId });
}

/**
 * 보고서 조회 (TTL 초과 시 null)
 * [보안] 생성자(ownerId)가 있는 보고서는 requesterId가 일치할 때만 반환한다.
 * 불일치 시 존재 여부를 감추기 위해 null(404)로 처리한다.
 */
export function getCachedReport(id: string, requesterId?: string | null): ScrReportData | null {
  cleanupExpired();
  const entry = reportCache.get(id);
  if (!entry) return null;

  // TTL 초과 체크
  if (Date.now() - entry.createdAt.getTime() > CACHE_TTL_MS) {
    reportCache.delete(id);
    return null;
  }

  // 소유자 바인딩된 보고서는 본인만 조회
  if (entry.ownerId && entry.ownerId !== requesterId) {
    return null;
  }

  return entry.data;
}

/** 보고서 ID 생성 (UUID v4 대체 — crypto 사용) */
export function generateReportId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
