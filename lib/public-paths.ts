/**
 * 공개(비로그인 진입 허용) 경로 정의 — 단일 소스
 *
 * 개인 사용자가 로그인 없이 둘러볼 수 있는 "매물 + 분석 체험 전반" 경로.
 * - 매물: 목록/상세 브라우징만 공개 (등록·내 매물·의향서·채팅 등 액션은 로그인 유지)
 * - 분석 체험: OPEN/TRIAL 티어 (전세보호·권리분석·시세전망·세금·공시가격·시세지도·주변환경)
 *
 * 사용처
 * - session-guard: 공개 경로에서는 단일탭 강제 로그아웃을 적용하지 않는다.
 *
 * 주의: 여기 목록은 "진입(열람) 허용" 정책일 뿐, 서버측 데이터 보호를 대체하지 않는다.
 * 로그인이 필요한 액션(쓰기/개인데이터)은 각 API/서버 액션에서 계속 인증을 검증해야 한다.
 */

/** prefix 로 매칭하는 공개 경로 (해당 경로 및 그 하위 전체 공개) */
const PUBLIC_PREFIXES = [
  // 분석 체험 (TRIAL)
  "/jeonse",
  "/rights",
  "/prediction",
  "/neighborhood",
  // 공개 도구 (OPEN)
  "/tax",
  "/official-price",
  "/price-map",
] as const;

/** 매물: 목록/상세만 공개, 아래 경로는 로그인 유지 */
const LISTINGS_AUTH_ONLY = ["/listings/new", "/listings/my"] as const;

export function isPublicPath(pathname: string): boolean {
  if (!pathname) return false;

  // 매물 목록
  if (pathname === "/listings") return true;

  // 매물 상세 (/listings/{id}) — new/my 등 액션 경로는 제외
  if (pathname.startsWith("/listings/")) {
    if (LISTINGS_AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return false;
    }
    // /listings/{id} 형태(세그먼트 1개)만 공개
    const rest = pathname.slice("/listings/".length);
    return rest.length > 0 && !rest.includes("/");
  }

  // 분석 체험 / 공개 도구
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
