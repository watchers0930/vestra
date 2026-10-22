/**
 * VESTRA 구독 요금제 — 단일 소스(SSOT)
 * ──────────────────────────────────────────────────────────────
 * 모든 요금제 화면(구독 페이지 renewal·app, 랜딩 PC·모바일)이 이 상수를 참조한다.
 * 과거 가격·플랜명을 각 화면에 하드코딩해 생기던 불일치(구독 페이지는 갱신됐으나
 * 랜딩만 옛 요금제 Lite/Professional로 남던 문제)를 원천 차단한다.
 *
 * 순수 데이터만 둔다(React/아이콘 의존 없음) — 서버·클라 어디서나 import 가능.
 */

export type PricingPlanKey = "free" | "pro" | "premium";

export interface PricingPlan {
  key: PricingPlanKey;
  /** 플랜명 (무료 / 프로 / 프리미엄) — 가격·한도는 member-subscription 정본(PRO 9,900·5건 / PREMIUM 29,900·20건)과 일치 */
  name: string;
  /** 월 요금 (원, 숫자) */
  monthlyPrice: number;
  /** 월 요금 표기 ("0원" / "29,900원" / "99,000원") */
  monthlyLabel: string;
  /** 연 요금 (원, 숫자) */
  annualPrice: number;
  /** 연 요금 표기 ("0원" / "299,000원" / "990,000원") */
  annualLabel: string;
  /** 연 결제 시 월 환산 표기 ("약 24,917원") — 무료는 null */
  annualMonthlyEquivLabel: string | null;
  /** 가격 뒤 기간 표기 ("" / "/월") */
  period: string;
  description: string;
  /** 표시용 공식 기능 목록(구독 페이지 renewal·app 기능 합집합 — 누락 없이 통합) */
  features: string[];
  /** 프로 플랜 강조 */
  highlight: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: "free",
    name: "무료",
    monthlyPrice: 0,
    monthlyLabel: "0원",
    annualPrice: 0,
    annualLabel: "0원",
    annualMonthlyEquivLabel: null,
    period: "",
    description: "부동산 분석을 처음 시작하는 분께",
    features: ["일 3회 AI 분석", "기본 시세 조회", "전세 안전성 간이 체크", "커뮤니티 접근"],
    highlight: false,
  },
  {
    key: "pro",
    name: "프로",
    monthlyPrice: 9900,
    monthlyLabel: "9,900원",
    annualPrice: 95040,
    annualLabel: "95,040원",
    annualMonthlyEquivLabel: "약 7,920원",
    period: "/월",
    description: "적극적으로 자산을 관리하는 투자자를 위해",
    features: [
      "등기감시 (최대 5건)",
      "무제한 AI 분석",
      "실시간 시세 알림",
      "PDF 리포트 다운로드",
      "전문가 상담 월 1회",
      "권리분석 상세 리포트",
      "세금 시뮬레이션",
    ],
    highlight: true,
  },
  {
    key: "premium",
    name: "프리미엄",
    monthlyPrice: 29900,
    monthlyLabel: "29,900원",
    annualPrice: 287040,
    annualLabel: "287,040원",
    annualMonthlyEquivLabel: "약 23,920원",
    period: "/월",
    description: "여러 집을 동시에 감시·관리하는 분께",
    features: [
      "등기감시 (최대 20건)",
      "프로 플랜 전체 기능 포함",
      "우선 고객 지원",
    ],
    highlight: false,
  },
];

export const PRICING_PLANS_BY_KEY: Record<PricingPlanKey, PricingPlan> = {
  free: PRICING_PLANS[0],
  pro: PRICING_PLANS[1],
  premium: PRICING_PLANS[2],
};

/** 요금제 비교표 (무료/프로/프리미엄) */
export const PRICING_COMPARISON: {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
}[] = [
  { feature: "등기감시", free: false, pro: "5건", premium: "20건" },
  { feature: "AI 분석 횟수", free: "일 3회", pro: "무제한", premium: "무제한" },
  { feature: "시세 조회", free: true, pro: true, premium: true },
  { feature: "실시간 시세 알림", free: false, pro: true, premium: true },
  { feature: "PDF 리포트", free: false, pro: true, premium: true },
  { feature: "전문가 상담", free: false, pro: "월 1회", premium: "월 1회" },
  { feature: "권리분석 상세", free: false, pro: true, premium: true },
  { feature: "세금 시뮬레이션", free: false, pro: true, premium: true },
];

/** 비회원 단건 상품: 구독 요금제와 별도인 서버 가격 계약. */
export const GUEST_SINGLE_MONITORING = {
  productId: "guest_monitoring_single",
  priceVersion: "2026-10-15",
  amount: 10000,
  currency: "KRW",
  propertyCount: 1,
  months: 1,
} as const;
