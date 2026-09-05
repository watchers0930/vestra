/**
 * 사업자(부동산 중개사) 홈 단일 설정 소스.
 * GNB 메뉴·드롭다운·빠른실행 링크가 모두 이 파일을 참조한다(경로 파편화 방지).
 * 기능 페이지는 기존 (app) 라우트를 그대로 링크한다.
 */

export const REALTOR_ROUTES = {
  home: "/realtor",
  listings: "/listings/my",
  listingNew: "/listings/new",
  agent: "/agent",
  eContract: "/e-contract",
  rights: "/rights",
  monitoring: "/monitoring",
  contract: "/contract",
  feasibility: "/feasibility",
  prediction: "/prediction",
  priceMap: "/price-map",
  expert: "/expert-connect",
  // 고객지원(더보기) 드롭다운
  jeonse: "/jeonse",
  assistant: "/assistant",
  tax: "/tax",
  officialPrice: "/official-price",
  apiHub: "/api-hub",
  profile: "/profile",
  landing: "/",
} as const;

export interface RealtorMenuItem {
  href: string;
  label: string;
}

/** GNB 메인 메뉴 (홈은 로고로 이동하므로 제외) */
export const REALTOR_MAIN: RealtorMenuItem[] = [
  { href: REALTOR_ROUTES.priceMap, label: "시세지도" },
  { href: REALTOR_ROUTES.listings, label: "매물 관리" },
  { href: REALTOR_ROUTES.agent, label: "중개관리" },
  { href: REALTOR_ROUTES.eContract, label: "전자계약" },
  { href: REALTOR_ROUTES.monitoring, label: "등기감시" },
];

/** GNB "분석 서비스" 드롭다운 (시세전망은 시세지도에 통합되어 제외) */
export const REALTOR_ANALYSIS: RealtorMenuItem[] = [
  { href: REALTOR_ROUTES.rights, label: "권리분석" },
  { href: REALTOR_ROUTES.contract, label: "계약검토" },
];

/** GNB 우측 단독 메뉴 */
export const REALTOR_TRAILING: RealtorMenuItem[] = [
  { href: REALTOR_ROUTES.expert, label: "전문가 연결" },
];

/** GNB "고객지원" 드롭다운 (그 외 도구 메뉴 수용) */
export const REALTOR_SUPPORT: RealtorMenuItem[] = [
  { href: REALTOR_ROUTES.jeonse, label: "전세보호" },
  { href: REALTOR_ROUTES.assistant, label: "AI 어시스턴트" },
  { href: REALTOR_ROUTES.tax, label: "세금계산" },
  { href: REALTOR_ROUTES.officialPrice, label: "공시가격 조회" },
];

/** 자주 쓰는 기능 카드의 아이콘 키 (lucide 매핑용) */
export type QuickIconKey = "agent" | "eContract" | "listings" | "rights" | "priceMap";

export interface QuickMenuItem {
  href: string;
  label: string;
  sub: string;
  icon: QuickIconKey;
  hot?: boolean;
}

/** 홈 "자주 쓰는 기능" 카드 */
export const REALTOR_QUICK: QuickMenuItem[] = [
  { href: REALTOR_ROUTES.agent, label: "중개관리", sub: "CRM · 손님매칭", icon: "agent", hot: true },
  { href: REALTOR_ROUTES.eContract, label: "전자계약", sub: "가계약서 작성", icon: "eContract" },
  { href: REALTOR_ROUTES.listings, label: "매물 목록", sub: "등록·수정", icon: "listings" },
  { href: REALTOR_ROUTES.rights, label: "권리분석", sub: "등기부 진단", icon: "rights" },
  { href: REALTOR_ROUTES.priceMap, label: "시세지도", sub: "실거래 조회", icon: "priceMap" },
];

/** 서브 페이지 히어로 카테고리 (경로 prefix → 라벨·설명) */
export const REALTOR_PAGE_META: { prefix: string; label: string; desc: string }[] = [
  { prefix: "/listings", label: "매물 관리", desc: "등록한 매물을 관리하고 거래 상태를 업데이트합니다" },
  { prefix: "/agent", label: "중개관리", desc: "고객과 계약 현황을 한 곳에서 관리합니다" },
  { prefix: "/e-contract", label: "전자계약", desc: "가계약서를 작성하고 서명을 진행합니다" },
  { prefix: "/monitoring", label: "등기감시", desc: "등기부 변동을 실시간으로 감시합니다" },
  { prefix: "/rights", label: "권리분석", desc: "등기부 권리관계를 AI가 분석합니다" },
  { prefix: "/contract", label: "계약검토", desc: "계약서의 위험 조항을 AI가 검토합니다" },
  { prefix: "/feasibility", label: "사업성분석", desc: "부동산 개발·투자 사업성을 분석합니다" },
  { prefix: "/prediction", label: "시세전망", desc: "지역별 시세 흐름과 전망을 확인합니다" },
  { prefix: "/price-map", label: "시세지도", desc: "지도에서 실거래가를 한눈에 확인합니다" },
  { prefix: "/expert-connect", label: "전문가 연결", desc: "분야별 전문가와 상담을 연결합니다" },
  { prefix: "/jeonse", label: "전세보호", desc: "전세 안전성을 분석하고 보호 절차를 안내합니다" },
  { prefix: "/assistant", label: "AI 어시스턴트", desc: "부동산 궁금증을 AI에게 물어보세요" },
  { prefix: "/tax", label: "세금계산", desc: "취득세·보유세·양도세를 계산합니다" },
  { prefix: "/official-price", label: "공시가격 조회", desc: "개별공시지가·공동주택가격을 조회합니다" },
  { prefix: "/api-hub", label: "API 데이터 허브", desc: "부동산 공공데이터를 활용합니다" },
];

export function getRealtorPageMeta(pathname: string) {
  return REALTOR_PAGE_META.find((m) => pathname.startsWith(m.prefix)) ?? null;
}
