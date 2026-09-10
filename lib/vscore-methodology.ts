/**
 * V-Score 방법론·검증 성능 공개 데이터 (P0-6)
 *
 * ⚠️ 데이터 무결성 원칙: 이 파일은 **검증 가능한 사실만** 담는다.
 *   - 가중치는 실제 산출 코드(lib/v-score.ts SOURCE_WEIGHTS)와 동일해야 한다.
 *   - 성능 수치는 실제 실증/백테스트로 뒷받침되는 값만 기재하고, 표본·한계를 함께 공개한다.
 *   - 근거 없는 "적중률 %" 헤드라인을 지어내지 않는다(과장 금지). 공신력의 본질은 투명성이다.
 *
 * @module lib/vscore-methodology
 */

/** V-Score 구성 소스와 가중치 (lib/v-score.ts SOURCE_WEIGHTS와 일치, 합 1.0) */
export interface VScoreComponent {
  key: string;
  name: string;
  weight: number;
  description: string;
}

export const VSCORE_COMPONENTS: VScoreComponent[] = [
  { key: "registry", name: "등기 권리관계", weight: 0.30, description: "등기부등본 갑구·을구 파싱 결과(근저당·가압류·전세권 등 선순위 권리)" },
  { key: "price", name: "전세가율·시세", weight: 0.25, description: "국토부 실거래가 기반 전세가율과 시세 대비 보증금 회수 가능성" },
  { key: "contract", name: "계약 조건", weight: 0.20, description: "보증금·계약 구조에서 도출되는 위험 신호" },
  { key: "landlord", name: "임대인 신뢰도", weight: 0.15, description: "임대인 관련 위험 지표(체납·다물건 등 확보 가능한 신호)" },
  { key: "region", name: "지역 요인", weight: 0.10, description: "지역 단위 시세 변동성·공급 등 거시 신호" },
];

/**
 * 검증(실증) 성능 — 실제 데이터로 뒷받침되는 값만 기재.
 * verifiable=true인 항목만 대외 수치로 노출한다.
 */
export interface EvidenceItem {
  label: string;
  value: string;
  detail: string;
  /** 실제 데이터로 검증된 값인가(대외 수치 노출 가능) */
  verifiable: boolean;
}

export const VSCORE_EVIDENCE: EvidenceItem[] = [
  {
    label: "실증 상관계수",
    value: "r = 0.687",
    detail: "투자점수와 실제 가격 추이의 상관(초기 실증, 표본 소규모 · 지속 확대 중)",
    verifiable: true,
  },
  {
    label: "물건별 백테스트",
    value: "분석마다 제공",
    detail: "시세전망 분석 시 과거 실거래로 예측 정확도(accuracy 12m)·평균오차율(MAPE)을 물건별로 산출·표시. MAPE 10% 이하면 우수.",
    verifiable: true,
  },
];

/** 방법론 요약(원리) */
export const VSCORE_METHODOLOGY = {
  summary:
    "V-Score는 등기 권리관계·전세가율/시세·계약조건·임대인 신뢰도·지역요인의 이질적 신호를 정규화한 뒤, 도메인 근거 가중치로 합산하고 신뢰도(데이터 충분성)로 보정해 0~100의 안전성 점수를 산출합니다.",
  xai:
    "각 소스의 기여도(breakdown)를 함께 노출해 '왜 이 점수인지'를 설명합니다(설명가능 AI).",
  confidence:
    "데이터가 부족한 소스는 신뢰도를 낮춰 점수 확신도에 반영합니다 — 과신하지 않습니다.",
} as const;

/** 투명 공개하는 한계(공신력의 핵심) */
export const VSCORE_LIMITATIONS: string[] = [
  "가중치는 도메인 근거 초기값이며, 실데이터 백테스트로 지속 캘리브레이션 대상입니다.",
  "실증 표본이 아직 소규모입니다. 적중률은 단정하지 않으며 표본 확대와 함께 갱신합니다.",
  "V-Score는 참고 지표이며 법적 판단·계약 의사결정을 대체하지 않습니다.",
];
