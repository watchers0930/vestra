/**
 * 사이트 도메인 단일 소스 (single source of truth)
 *
 * 도메인이 바뀌면 이 파일만 갱신하면 된다.
 * - SITE_URL: SEO/절대링크의 canonical 기준 도메인
 * - PROD_HOSTS: "운영 도메인"으로 취급할 host 목록 (테스트/샘플 게이팅 판별용)
 */

/** 정식 서비스 URL (canonical) — 프로토콜 포함, 끝에 슬래시 없음 */
export const SITE_URL = "https://vestra.ai.kr";

/** 운영(프로덕션)으로 취급할 host 목록. 도메인 추가 시 여기만 갱신. */
export const PROD_HOSTS: readonly string[] = [
  "vestra.ai.kr",
  "www.vestra.ai.kr",
  "vestra-plum.vercel.app",
];

/** 브라우저 host가 운영 도메인인지 여부 (테스트/프리뷰/로컬은 false) */
export function isProdHost(host?: string | null): boolean {
  return !!host && PROD_HOSTS.includes(host);
}
