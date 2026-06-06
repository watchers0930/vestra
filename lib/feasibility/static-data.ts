/**
 * VESTRA SCR 사업성 보고서 — 정적 폴백 데이터
 * ──────────────────────────────────────────────
 * API 호출 불가 시 활용하는 정적 참조 데이터.
 * 정부 부동산 대책 연표, 규제지역, HUG 고분양가 관리지역,
 * 주택담보대출 규제 등 사업성 분석에 필요한 기초 데이터.
 */

import { isRegulatedArea } from "./static-data-policy";

// ─── re-export (기존 import 경로 유지) ───

export type { PolicyEvent, RegulatedArea, HUGHighPriceArea } from "./static-data-policy";

export {
  POLICY_TIMELINE, REGULATED_AREAS, isRegulatedArea,
  HUG_HIGH_PRICE_AREAS, isHUGHighPriceArea,
} from "./static-data-policy";

// ─── 타입 정의 ───

export interface LoanRegulation {
  category: string;       // "LTV", "DTI", "DSR"
  area: string;           // "투기과열지구", "조정대상지역", "비규제지역"
  ratio: number;          // 비율 (%)
  condition: string;      // 적용 조건
  effectiveDate: string;  // 시행일
}

// ─── 주택담보대출 규제 (LTV/DTI/DSR) ───

export const LOAN_REGULATIONS: LoanRegulation[] = [
  // LTV (담보인정비율)
  {
    category: "LTV",
    area: "투기과열지구",
    ratio: 40,
    condition: "9억 이하 주택, 무주택 세대주",
    effectiveDate: "2023-01-03",
  },
  {
    category: "LTV",
    area: "조정대상지역",
    ratio: 50,
    condition: "무주택자",
    effectiveDate: "2023-01-03",
  },
  {
    category: "LTV",
    area: "비규제지역",
    ratio: 70,
    condition: "일반",
    effectiveDate: "2022-06-21",
  },
  {
    category: "LTV",
    area: "비규제지역",
    ratio: 80,
    condition: "생애최초 주택구입",
    effectiveDate: "2022-06-21",
  },
  // DTI (총부채상환비율)
  {
    category: "DTI",
    area: "투기과열지구",
    ratio: 40,
    condition: "주택담보대출",
    effectiveDate: "2023-01-03",
  },
  {
    category: "DTI",
    area: "조정대상지역",
    ratio: 50,
    condition: "주택담보대출",
    effectiveDate: "2023-01-03",
  },
  {
    category: "DTI",
    area: "비규제지역",
    ratio: 60,
    condition: "주택담보대출",
    effectiveDate: "2022-06-21",
  },
  // DSR (총부채원리금상환비율)
  {
    category: "DSR",
    area: "전지역",
    ratio: 40,
    condition: "총대출 1억 초과 (은행권)",
    effectiveDate: "2022-01-01",
  },
  {
    category: "DSR",
    area: "전지역",
    ratio: 50,
    condition: "총대출 1억 초과 (2금융권)",
    effectiveDate: "2022-07-01",
  },
  {
    category: "DSR",
    area: "수도권",
    ratio: 40,
    condition: "스트레스 DSR 적용 (가산금리 0.75%p)",
    effectiveDate: "2024-09-01",
  },
  {
    category: "DSR",
    area: "비수도권",
    ratio: 40,
    condition: "스트레스 DSR 적용 (가산금리 0.375%p)",
    effectiveDate: "2025-01-01",
  },
];

/** 지역별 대출 규제 조회 */
export function getLoanRegulations(
  address: string
): {
  ltv: LoanRegulation[];
  dti: LoanRegulation[];
  dsr: LoanRegulation[];
} {
  const areaType = isRegulatedArea(address).isRegulated
    ? "투기과열지구"
    : "비규제지역";

  const isMetro = ["서울", "경기", "인천"].some((k) => address.includes(k));
  const dsrArea = isMetro ? "수도권" : "비수도권";

  return {
    ltv: LOAN_REGULATIONS.filter(
      (r) => r.category === "LTV" && (r.area === areaType || r.area === "전지역")
    ),
    dti: LOAN_REGULATIONS.filter(
      (r) => r.category === "DTI" && (r.area === areaType || r.area === "전지역")
    ),
    dsr: LOAN_REGULATIONS.filter(
      (r) => r.category === "DSR" && (r.area === dsrArea || r.area === "전지역")
    ),
  };
}

// ─── 주요 수도권 분양사례 (2023~2025) ───

export interface SupplyCaseEntry {
  name: string;           // 단지명
  address: string;        // 소재지
  supplyDate: string;     // 분양시기 "YYYY-MM"
  units: number;          // 세대수
  pricePerSqm: number;    // 분양가 (만원/㎡)
  competitionRate: number; // 청약경쟁률
  saleRate: number;       // 분양률 (%)
  projectType: string;    // 사업유형
}

export const SUPPLY_CASES_DB: SupplyCaseEntry[] = [
  // ─ 서울 ─
  {
    name: "래미안 원베일리",
    address: "서울특별시 서초구 반포동",
    supplyDate: "2023-03",
    units: 2990,
    pricePerSqm: 5850,
    competitionRate: 308.5,
    saleRate: 100,
    projectType: "재건축",
  },
  {
    name: "디에이치 방배",
    address: "서울특별시 서초구 방배동",
    supplyDate: "2024-06",
    units: 3064,
    pricePerSqm: 6120,
    competitionRate: 425.0,
    saleRate: 100,
    projectType: "재건축",
  },
  {
    name: "청담 르엘",
    address: "서울특별시 강남구 청담동",
    supplyDate: "2024-02",
    units: 1261,
    pricePerSqm: 7350,
    competitionRate: 196.2,
    saleRate: 100,
    projectType: "재건축",
  },
  {
    name: "동작하이팰리스",
    address: "서울특별시 동작구 흑석동",
    supplyDate: "2023-09",
    units: 1540,
    pricePerSqm: 4280,
    competitionRate: 72.3,
    saleRate: 98.5,
    projectType: "재개발",
  },
  {
    name: "힐스테이트 메이플",
    address: "서울특별시 마포구 아현동",
    supplyDate: "2024-04",
    units: 1863,
    pricePerSqm: 4950,
    competitionRate: 145.7,
    saleRate: 100,
    projectType: "재개발",
  },
  {
    name: "e편한세상 노원 포레스트",
    address: "서울특별시 노원구 상계동",
    supplyDate: "2023-11",
    units: 1204,
    pricePerSqm: 3150,
    competitionRate: 35.8,
    saleRate: 95.2,
    projectType: "아파트",
  },
  {
    name: "롯데캐슬 이스트폴",
    address: "서울특별시 강동구 둔촌동",
    supplyDate: "2024-08",
    units: 2678,
    pricePerSqm: 4780,
    competitionRate: 88.9,
    saleRate: 99.1,
    projectType: "아파트",
  },
  // ─ 경기 ─
  {
    name: "수원 영통 자이",
    address: "경기도 수원시 영통구 이의동",
    supplyDate: "2023-05",
    units: 1582,
    pricePerSqm: 2680,
    competitionRate: 52.4,
    saleRate: 97.8,
    projectType: "아파트",
  },
  {
    name: "평택 고덕 대방 엘리움",
    address: "경기도 평택시 고덕동",
    supplyDate: "2023-07",
    units: 2135,
    pricePerSqm: 1850,
    competitionRate: 18.3,
    saleRate: 88.5,
    projectType: "아파트",
  },
  {
    name: "GTX 운정 중앙하이츠",
    address: "경기도 파주시 운정동",
    supplyDate: "2024-01",
    units: 1875,
    pricePerSqm: 2150,
    competitionRate: 28.6,
    saleRate: 92.3,
    projectType: "아파트",
  },
  {
    name: "광교 호수공원 자이",
    address: "경기도 수원시 영통구 하동",
    supplyDate: "2023-10",
    units: 1345,
    pricePerSqm: 3420,
    competitionRate: 95.2,
    saleRate: 100,
    projectType: "아파트",
  },
  {
    name: "힐스테이트 광명역",
    address: "경기도 광명시 광명동",
    supplyDate: "2024-05",
    units: 1678,
    pricePerSqm: 3580,
    competitionRate: 115.8,
    saleRate: 99.5,
    projectType: "아파트",
  },
  {
    name: "양주 옥정 제일풍경채",
    address: "경기도 양주시 옥정동",
    supplyDate: "2023-08",
    units: 1920,
    pricePerSqm: 1680,
    competitionRate: 12.5,
    saleRate: 78.4,
    projectType: "아파트",
  },
  {
    name: "동탄2 시범 더샵",
    address: "경기도 화성시 동탄면",
    supplyDate: "2024-03",
    units: 2450,
    pricePerSqm: 2380,
    competitionRate: 42.1,
    saleRate: 96.7,
    projectType: "아파트",
  },
  {
    name: "위례 포레자이",
    address: "경기도 성남시 수정구 창곡동",
    supplyDate: "2024-09",
    units: 1128,
    pricePerSqm: 3850,
    competitionRate: 182.3,
    saleRate: 100,
    projectType: "아파트",
  },
  {
    name: "과천 디에트르 퍼스티지",
    address: "경기도 과천시 갈현동",
    supplyDate: "2025-01",
    units: 1560,
    pricePerSqm: 4250,
    competitionRate: 210.5,
    saleRate: 100,
    projectType: "아파트",
  },
  // ─ 인천 ─
  {
    name: "검단 파라곤 센트럴파크",
    address: "인천광역시 서구 당하동",
    supplyDate: "2023-06",
    units: 2340,
    pricePerSqm: 1720,
    competitionRate: 15.8,
    saleRate: 82.6,
    projectType: "아파트",
  },
  {
    name: "송도 더샵 퍼스트파크",
    address: "인천광역시 연수구 송도동",
    supplyDate: "2024-07",
    units: 1856,
    pricePerSqm: 2890,
    competitionRate: 68.4,
    saleRate: 97.2,
    projectType: "아파트",
  },
  {
    name: "루원시티 SK리더스뷰",
    address: "인천광역시 미추홀구 학익동",
    supplyDate: "2023-12",
    units: 1495,
    pricePerSqm: 2050,
    competitionRate: 22.7,
    saleRate: 89.3,
    projectType: "재개발",
  },
  {
    name: "영종하늘도시 제일풍경채",
    address: "인천광역시 중구 운남동",
    supplyDate: "2024-10",
    units: 1680,
    pricePerSqm: 1580,
    competitionRate: 8.2,
    saleRate: 72.8,
    projectType: "아파트",
  },
];

/**
 * 주소 기반 주변 분양사례 필터링
 */
export function getNearbySupplyCases(
  address: string,
  radius: number = 10
): SupplyCaseEntry[] {
  const keywords = address
    .replace(/특별시|광역시|특별자치시/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const scored = SUPPLY_CASES_DB.map((entry) => {
    let score = 0;
    for (const kw of keywords) {
      if (entry.address.includes(kw)) score += 1;
    }
    return { entry, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matched.length >= radius) {
    return matched.slice(0, radius).map((s) => s.entry);
  }

  const metro = ["서울", "경기", "인천"].find((m) => address.includes(m));
  if (metro) {
    const metroMatched = SUPPLY_CASES_DB.filter(
      (e) =>
        e.address.includes(metro) &&
        !matched.some((m) => m.entry.name === e.name)
    );
    const combined = [
      ...matched.map((s) => s.entry),
      ...metroMatched,
    ];
    return combined.slice(0, radius);
  }

  return SUPPLY_CASES_DB.slice(0, radius);
}

// ─── 종합 정적 데이터 조회 ───

export interface StaticMarketContext {
  recentPolicies: PolicyEvent[];
  regulationStatus: { isRegulated: boolean; regulations: RegulatedArea[] };
  hugStatus: { isHighPrice: boolean; area: HUGHighPriceArea | null };
  loanRegulations: { ltv: LoanRegulation[]; dti: LoanRegulation[]; dsr: LoanRegulation[] };
}

import type { PolicyEvent, RegulatedArea, HUGHighPriceArea } from "./static-data-policy";
import { POLICY_TIMELINE, isHUGHighPriceArea } from "./static-data-policy";

/** 특정 지역의 정적 시장 컨텍스트 일괄 조회 */
export function getStaticMarketContext(address: string): StaticMarketContext {
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  return {
    recentPolicies: POLICY_TIMELINE.filter(
      (p) => new Date(p.date) >= twoYearsAgo
    ),
    regulationStatus: isRegulatedArea(address),
    hugStatus: isHUGHighPriceArea(address),
    loanRegulations: getLoanRegulations(address),
  };
}
