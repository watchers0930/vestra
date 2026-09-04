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
  { href: REALTOR_ROUTES.feasibility, label: "사업성분석" },
];

/** GNB 우측 단독 메뉴 */
export const REALTOR_TRAILING: RealtorMenuItem[] = [
  { href: REALTOR_ROUTES.expert, label: "전문가 연결" },
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
