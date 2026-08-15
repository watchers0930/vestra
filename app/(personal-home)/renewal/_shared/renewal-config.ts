/**
 * renewal 단일 설정 소스 — 경로(#10)와 화면별 접근 정책(#11)을 한 곳에서 관리한다.
 * GNB 메뉴, 로그인 게이트, 화면 링크가 모두 이 파일을 참조하도록 하여
 * 링크 경로/정책이 파일마다 흩어지며 파편화되는 것을 방지한다.
 */

export type RenewalKey =
  | "listings" | "jeonse" | "rights" | "monitoring" | "contract" | "price-map"
  | "expert" | "assistant" | "official-price" | "tax";

/** renewal 및 공통 경로 단일 소스 */
export const RENEWAL_ROUTES = {
  home: "/home",
  landing: "/",
  listings: "/renewal/listings-list",
  listingsMobile: "/renewal/listings-list-mobile",
  jeonse: "/renewal/jeonse",
  rights: "/renewal/rights",
  monitoring: "/renewal/monitoring",
  contract: "/renewal/contract",
  priceMap: "/renewal/price-map",
  expert: "/renewal/expert",
  assistant: "/renewal/assistant",
  officialPrice: "/renewal/official-price",
  tax: "/renewal/tax",
  // 비-renewal 공통
  login: "/login",
  signup: "/signup",
  profile: "/profile",
  logout: "/logout",
} as const;

/**
 * 화면별 접근 등급.
 * - public   : 로그인 불필요 (완전 공개)
 * - trial    : 로그인 불필요, 게스트 일일/횟수 한도 (서버 rate-limit로 제어)
 * - required : 로그인 필수 (현재 미사용 — 진입은 자유, 저장 액션 시 로그인 모달)
 */
export type AccessLevel = "public" | "trial" | "required";

export interface RenewalFeature {
  key: RenewalKey;
  href: string;
  label: string;
  access: AccessLevel;
  /** 로그인 게이트/안내에 노출되는 기능명 */
  featureName: string;
  /** 로그인 게이트/안내 부제 */
  description: string;
}

/** GNB 메인 메뉴 */
export const RENEWAL_MAIN: RenewalFeature[] = [
  { key: "listings", href: RENEWAL_ROUTES.listings, label: "매물검색", access: "public", featureName: "매물검색", description: "조건에 맞는 매물을 검색합니다" },
  { key: "jeonse", href: RENEWAL_ROUTES.jeonse, label: "전세보호", access: "trial", featureName: "전세보호", description: "전세 안전성을 분석하고 보호 절차를 안내합니다" },
  { key: "rights", href: RENEWAL_ROUTES.rights, label: "권리분석", access: "trial", featureName: "권리분석", description: "등기부 권리관계를 AI가 분석합니다" },
  { key: "monitoring", href: RENEWAL_ROUTES.monitoring, label: "등기감시", access: "trial", featureName: "등기감시", description: "등기부 변동을 실시간 감시하고 위험을 즉시 알려드립니다" },
  { key: "contract", href: RENEWAL_ROUTES.contract, label: "계약검토", access: "trial", featureName: "계약검토", description: "AI가 계약서의 위험 조항과 독소 조항을 자동으로 분석합니다" },
  { key: "price-map", href: RENEWAL_ROUTES.priceMap, label: "시세지도", access: "public", featureName: "시세지도", description: "지역별 시세와 전망을 지도로 확인합니다" },
];

/** GNB 고객지원 드롭다운 */
export const RENEWAL_SUPPORT: RenewalFeature[] = [
  { key: "expert", href: RENEWAL_ROUTES.expert, label: "전문가연결", access: "public", featureName: "전문가 연결", description: "부동산 전문가와 1:1 상담을 연결해 드립니다" },
  { key: "assistant", href: RENEWAL_ROUTES.assistant, label: "AI 어시스턴트", access: "trial", featureName: "AI 어시스턴트", description: "부동산 궁금증을 AI에게 물어보세요" },
  { key: "official-price", href: RENEWAL_ROUTES.officialPrice, label: "공시가격조회", access: "public", featureName: "공시가격 조회", description: "개별공시지가·공동주택가격을 조회합니다" },
  { key: "tax", href: RENEWAL_ROUTES.tax, label: "세금계산", access: "public", featureName: "세금계산", description: "취득세·보유세·양도세를 계산합니다" },
];

/** 화면별 접근 정책 조회 (key → 기능 정의) */
export const RENEWAL_FEATURES: Record<RenewalKey, RenewalFeature> = [
  ...RENEWAL_MAIN,
  ...RENEWAL_SUPPORT,
].reduce((acc, f) => {
  acc[f.key] = f;
  return acc;
}, {} as Record<RenewalKey, RenewalFeature>);
