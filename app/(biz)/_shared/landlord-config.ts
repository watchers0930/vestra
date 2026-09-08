/**
 * 사업자(임대사업자·RENTAL_BIZ) 홈 단일 설정 소스.
 * GNB 메뉴·드롭다운 링크가 모두 이 파일을 참조한다(경로 파편화 방지).
 * 기능 페이지는 기존 (app) 라우트를 그대로 링크한다.
 *
 * 중개사(REALESTATE)와 달리 "중개관리·전자계약"(중개사 도구)은 제외한다.
 * 항목 구성은 기존 rentalBizMenuGroups(중개사 도구 제외)와 동일하다.
 */

export const LANDLORD_ROUTES = {
  home: "/landlord",
  listings: "/listings/my",
  listingNew: "/listings/new",
  rights: "/rights",
  monitoring: "/monitoring",
  contract: "/contract",
  prediction: "/prediction",
  priceMap: "/price-map",
  expert: "/expert-connect",
  // 고객지원(더보기) 드롭다운
  assistant: "/assistant",
  tax: "/tax",
  officialPrice: "/official-price",
  profile: "/profile",
  landing: "/",
} as const;

export interface LandlordMenuItem {
  href: string;
  label: string;
}

/** GNB 메인 메뉴 (홈은 로고로 이동하므로 제외) */
export const LANDLORD_MAIN: LandlordMenuItem[] = [
  { href: LANDLORD_ROUTES.priceMap, label: "시세지도" },
  { href: LANDLORD_ROUTES.listings, label: "매물 관리" },
  { href: LANDLORD_ROUTES.monitoring, label: "등기감시" },
];

/** GNB "분석 서비스" 드롭다운 */
export const LANDLORD_ANALYSIS: LandlordMenuItem[] = [
  { href: LANDLORD_ROUTES.rights, label: "권리분석" },
  { href: LANDLORD_ROUTES.contract, label: "계약검토" },
  { href: LANDLORD_ROUTES.prediction, label: "시세전망" },
];

/** GNB 우측 단독 메뉴 */
export const LANDLORD_TRAILING: LandlordMenuItem[] = [
  { href: LANDLORD_ROUTES.expert, label: "전문가 연결" },
];

/** GNB "고객지원" 드롭다운 (그 외 도구 메뉴 수용) */
export const LANDLORD_SUPPORT: LandlordMenuItem[] = [
  { href: LANDLORD_ROUTES.assistant, label: "AI 어시스턴트" },
  { href: LANDLORD_ROUTES.tax, label: "세금계산" },
  { href: LANDLORD_ROUTES.officialPrice, label: "공시가격 조회" },
];

/** 서브 페이지 히어로 카테고리 (경로 prefix → 라벨·설명). 임대사업자 접근 기능만 포함. */
export const LANDLORD_PAGE_META: { prefix: string; label: string; desc: string }[] = [
  { prefix: "/listings", label: "매물 관리", desc: "보유 매물을 등록하고 거래 상태를 관리합니다" },
  { prefix: "/monitoring", label: "등기감시", desc: "등기부 변동을 실시간으로 감시합니다" },
  { prefix: "/rights", label: "권리분석", desc: "등기부 권리관계를 AI가 분석합니다" },
  { prefix: "/contract", label: "계약검토", desc: "계약서의 위험 조항을 AI가 검토합니다" },
  { prefix: "/prediction", label: "시세전망", desc: "지역별 시세 흐름과 전망을 확인합니다" },
  { prefix: "/price-map", label: "시세지도", desc: "지도에서 실거래가를 한눈에 확인합니다" },
  { prefix: "/expert-connect", label: "전문가 연결", desc: "분야별 전문가와 상담을 연결합니다" },
  { prefix: "/assistant", label: "AI 어시스턴트", desc: "부동산 궁금증을 AI에게 물어보세요" },
  { prefix: "/tax", label: "세금계산", desc: "취득세·보유세·양도세를 계산합니다" },
  { prefix: "/official-price", label: "공시가격 조회", desc: "개별공시지가·공동주택가격을 조회합니다" },
];

export function getLandlordPageMeta(pathname: string) {
  return LANDLORD_PAGE_META.find((m) => pathname.startsWith(m.prefix)) ?? null;
}

/** 홈 "자주 쓰는 기능" 카드 아이콘 키 (중개사 도구 제외) */
export type LandlordQuickIconKey = "listings" | "monitoring" | "rights" | "priceMap" | "tax";

export interface LandlordQuickItem {
  href: string;
  label: string;
  sub: string;
  icon: LandlordQuickIconKey;
  hot?: boolean;
}

/** 홈 "자주 쓰는 기능" 카드 — 임대사업자 관점(내 자산 임대 운영) */
export const LANDLORD_QUICK: LandlordQuickItem[] = [
  { href: LANDLORD_ROUTES.listings, label: "매물 관리", sub: "등록·수정", icon: "listings", hot: true },
  { href: LANDLORD_ROUTES.monitoring, label: "등기감시", sub: "권리변동 감시", icon: "monitoring" },
  { href: LANDLORD_ROUTES.rights, label: "권리분석", sub: "등기부 진단", icon: "rights" },
  { href: LANDLORD_ROUTES.priceMap, label: "시세지도", sub: "실거래 조회", icon: "priceMap" },
  { href: LANDLORD_ROUTES.tax, label: "세금계산", sub: "보유·양도세", icon: "tax" },
];
