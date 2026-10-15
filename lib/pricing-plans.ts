/**
 * VESTRA 구독 요금제 — 단일 소스(SSOT)
 * ──────────────────────────────────────────────────────────────
 * 모든 요금제 화면(구독 페이지 renewal·app, 랜딩 PC·모바일)이 이 상수를 참조한다.
 * 과거 가격·플랜명을 각 화면에 하드코딩해 생기던 불일치(구독 페이지는 갱신됐으나
 * 랜딩만 옛 요금제 Lite/Professional로 남던 문제)를 원천 차단한다.
 *
 * 순수 데이터만 둔다(React/아이콘 의존 없음) — 서버·클라 어디서나 import 가능.
 */

export type PricingPlanKey = "free" | "pro" | "business";

export interface PricingPlan {
  key: PricingPlanKey;
  /** 플랜명 (무료 / 프로 / 비즈니스) */
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
    monthlyPrice: 29900,
    monthlyLabel: "29,900원",
    annualPrice: 299000,
    annualLabel: "299,000원",
    annualMonthlyEquivLabel: "약 24,917원",
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
    key: "business",
    name: "비즈니스",
    monthlyPrice: 99000,
    monthlyLabel: "99,000원",
    annualPrice: 990000,
    annualLabel: "990,000원",
    annualMonthlyEquivLabel: "약 82,500원",
    period: "/월",
    description: "팀과 함께 사용하는 부동산 전문가를 위해",
    features: [
      "등기감시 (최대 20건)",
      "프로 플랜 전체 포함",
      "REST API 접근",
      "다중 사용자 (최대 10명)",
      "전담 매니저 배정",
      "맞춤형 리포트 제작",
      "SLA 99.9% 보장",
    ],
    highlight: false,
  },
];

export const PRICING_PLANS_BY_KEY: Record<PricingPlanKey, PricingPlan> = {
  free: PRICING_PLANS[0],
  pro: PRICING_PLANS[1],
  business: PRICING_PLANS[2],
};

/** 요금제 비교표 (무료/프로/비즈니스) */
export const PRICING_COMPARISON: {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
}[] = [
  { feature: "등기감시", free: false, pro: "5건", business: "20건" },
  { feature: "AI 분석 횟수", free: "일 3회", pro: "무제한", business: "무제한" },
  { feature: "시세 조회", free: true, pro: true, business: true },
  { feature: "실시간 시세 알림", free: false, pro: true, business: true },
  { feature: "PDF 리포트", free: false, pro: true, business: true },
  { feature: "전문가 상담", free: false, pro: "월 1회", business: "무제한" },
  { feature: "권리분석 상세", free: false, pro: true, business: true },
  { feature: "세금 시뮬레이션", free: false, pro: true, business: true },
  { feature: "API 접근", free: false, pro: false, business: true },
  { feature: "다중 사용자", free: false, pro: false, business: "최대 10명" },
  { feature: "전담 매니저", free: false, pro: false, business: true },
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
