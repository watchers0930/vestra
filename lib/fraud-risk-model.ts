/**
 * VESTRA 전세사기 예방 위험 평가 모델
 * ──────────────────────────────────────
 * 특허 핵심: AI 기반 전세사기 예방 정량적 위험 평가 시스템.
 * 5대 피처 그룹, Gradient Boosting 시뮬레이션(규칙 기반 앙상블),
 * SHAP 유사 기여도 산출(Leave-One-Out).
 *
 * 순수 TypeScript 구현. 향후 ML 모델 교체 가능 인터페이스 설계.
 */

import type {
  FraudRiskResult,
  FraudFeatureContribution,
} from "./patent-types";
import type { RiskScore } from "./risk-scoring";
import type { ContractAnalysisResult } from "./contract-analyzer";

// ─── 피처 정의 ───

interface FraudFeature {
  id: string;
  name: string;
  group: FraudFeatureContribution["featureGroup"];
  weight: number;       // 모델 가중치 (높을수록 영향력 큼)
  riskThreshold: number; // 이 값 이상이면 위험
  safeThreshold: number; // 이 값 이하면 안전
  extractor: (input: FraudModelInput) => number; // 0-100 정규화 값
  description: (value: number) => string;
}

export interface FraudModelInput {
  // 권리관계
  riskScore?: RiskScore;
  mortgageRatio?: number;      // %
  seizureCount?: number;
  provisionalSeizureCount?: number;
  priorityClaimRatio?: number; // 선순위 채권 비율 %

  // 시세/가격
  jeonseRatio?: number;        // 전세가율 %
  priceVolatility?: number;    // 시세 변동률 %
  vacancyRate?: number;        // 공실률 %

  // 임대인 정보
  isMultiHomeOwner?: boolean;
  isCorporate?: boolean;
  hasTaxDelinquency?: boolean;
  creditScore?: number;

  // 건물/지역
  buildingAge?: number;        // 건축년수
  unitCount?: number;          // 세대수
  regionFraudRate?: number;    // 지역 사기 발생률 %
  auctionRate?: number;        // 경매 발생률 %

  // 계약조건
  contractResult?: ContractAnalysisResult;
  hasSpecialClauses?: boolean;
  isBrokerRegistered?: boolean;
  hasDepositInsurance?: boolean;

  // 위치 (유사 사례 매칭용)
  latitude?: number;
  longitude?: number;
}

// ─── 피처 데이터베이스 (15개 피처) ───

const FRAUD_FEATURES: FraudFeature[] = [
  // 권리관계 그룹
  {
    id: "mortgage_ratio",
    name: "근저당 비율",
    group: "권리관계",
    weight: 0.12,
    riskThreshold: 70,
    safeThreshold: 30,
    extractor: (input) => Math.min(100, input.mortgageRatio ?? 0),
    description: (v) => `근저당 비율 ${v.toFixed(0)}% ${v > 70 ? "(고위험)" : v > 50 ? "(주의)" : "(안전)"}`,
  },
  {
    id: "seizure_present",
    name: "압류/가압류 유무",
    group: "권리관계",
    weight: 0.10,
    riskThreshold: 1,
    safeThreshold: 0,
    extractor: (input) => Math.min(100, ((input.seizureCount ?? 0) + (input.provisionalSeizureCount ?? 0)) * 50),
    description: (v) => v > 0 ? `압류/가압류 존재 (위험도 ${v.toFixed(0)})` : "압류/가압류 없음",
  },
  {
    id: "priority_claim_ratio",
    name: "선순위 채권 비율",
    group: "권리관계",
    weight: 0.08,
    riskThreshold: 80,
    safeThreshold: 30,
    extractor: (input) => Math.min(100, input.priorityClaimRatio ?? 0),
    description: (v) => `선순위 채권 비율 ${v.toFixed(0)}%`,
  },

  // 시세/가격 그룹
  {
    id: "jeonse_ratio",
    name: "전세가율",
    group: "시세가격",
    weight: 0.14,
    riskThreshold: 80,
    safeThreshold: 60,
    extractor: (input) => Math.min(100, input.jeonseRatio ?? 50),
    description: (v) => `전세가율 ${v.toFixed(1)}% ${v > 80 ? "(깡통전세 위험)" : v > 70 ? "(주의)" : "(양호)"}`,
  },
  {
    id: "price_volatility",
    name: "시세 변동률",
    group: "시세가격",
    weight: 0.06,
    riskThreshold: 15,
    safeThreshold: 5,
    extractor: (input) => Math.min(100, (input.priceVolatility ?? 5) * 5),
    description: (v) => `시세 변동률 ${(v / 5).toFixed(1)}%`,
  },
  {
    id: "vacancy_rate",
    name: "공실률",
    group: "시세가격",
    weight: 0.04,
    riskThreshold: 10,
    safeThreshold: 3,
    extractor: (input) => Math.min(100, (input.vacancyRate ?? 3) * 8),
    description: (v) => `공실률 ${(v / 8).toFixed(1)}%`,
  },

  // 임대인 그룹
  {
    id: "multi_home_owner",
    name: "다주택 보유",
    group: "임대인",
    weight: 0.06,
    riskThreshold: 1,
    safeThreshold: 0,
    extractor: (input) => input.isMultiHomeOwner ? 70 : 0,
    description: (v) => v > 0 ? "다주택 보유자 (사기 위험 상승)" : "단일 주택 보유",
  },
  {
    id: "corporate_landlord",
    name: "법인/개인 구분",
    group: "임대인",
    weight: 0.04,
    riskThreshold: 1,
    safeThreshold: 0,
    extractor: (input) => input.isCorporate ? 50 : 0,
    description: (v) => v > 0 ? "법인 임대 (확인 필요)" : "개인 임대",
  },
  {
    id: "tax_delinquency",
    name: "세금 체납",
    group: "임대인",
    weight: 0.08,
    riskThreshold: 1,
    safeThreshold: 0,
    extractor: (input) => input.hasTaxDelinquency ? 90 : 0,
    description: (v) => v > 0 ? "세금 체납 이력 있음 (고위험)" : "체납 없음",
  },

  // 건물/지역 그룹
  {
    id: "building_age",
    name: "건축년수",
    group: "건물지역",
    weight: 0.03,
    riskThreshold: 30,
    safeThreshold: 10,
    extractor: (input) => Math.min(100, (input.buildingAge ?? 15) * 2.5),
    description: (v) => `건축 ${Math.round(v / 2.5)}년 ${v > 75 ? "(노후)" : "(양호)"}`,
  },
  {
    id: "region_fraud_rate",
    name: "지역 사기 발생률",
    group: "건물지역",
    weight: 0.08,
    riskThreshold: 3,
    safeThreshold: 0.5,
    extractor: (input) => Math.min(100, (input.regionFraudRate ?? 1) * 20),
    description: (v) => `지역 사기 발생률 ${(v / 20).toFixed(1)}% ${v > 60 ? "(다발 지역)" : "(일반)"}`,
  },
  {
    id: "auction_rate",
    name: "경매 발생률",
    group: "건물지역",
    weight: 0.05,
    riskThreshold: 3,
    safeThreshold: 1,
    extractor: (input) => Math.min(100, (input.auctionRate ?? 1) * 25),
    description: (v) => `경매 발생률 ${(v / 25).toFixed(1)}%`,
  },

  // 계약조건 그룹
  {
    id: "contract_safety",
    name: "계약서 안전점수",
    group: "계약조건",
    weight: 0.06,
    riskThreshold: 40,
    safeThreshold: 70,
    extractor: (input) => 100 - (input.contractResult?.safetyScore ?? 70),
    description: (v) => `계약서 위험도 ${v.toFixed(0)}점`,
  },
  {
    id: "broker_registered",
    name: "중개사 등록 여부",
    group: "계약조건",
    weight: 0.03,
    riskThreshold: 1,
    safeThreshold: 0,
    extractor: (input) => input.isBrokerRegistered === false ? 80 : 0,
    description: (v) => v > 0 ? "중개사 미등록 (위험)" : "중개사 등록 확인",
  },
  {
    id: "deposit_insurance",
    name: "보증보험 가입",
    group: "계약조건",
    weight: 0.03,
    riskThreshold: 1,
    safeThreshold: 0,
    extractor: (input) => input.hasDepositInsurance ? 0 : 60,
    description: (v) => v > 0 ? "보증보험 미가입 (권고)" : "보증보험 가입 완료",
  },
];

// ─── 위험 등급 매핑 ───

function getFraudRiskLevel(
  score: number,
): { level: FraudRiskResult["riskLevel"]; label: string } {
  if (score >= 80) return { level: "critical", label: "매우위험" };
  if (score >= 60) return { level: "danger", label: "위험" };
  if (score >= 40) return { level: "warning", label: "주의" };
  if (score >= 20) return { level: "caution", label: "경계" };
  return { level: "safe", label: "안전" };
}

// ─── SHAP 유사 기여도 산출 (Leave-One-Out) ───

function calculateContributions(
  input: FraudModelInput,
): FraudFeatureContribution[] {
  // 전체 점수 계산
  const fullScore = calculateRawFraudScore(input);

  return FRAUD_FEATURES.map((feature) => {
    const value = feature.extractor(input);

    // Leave-One-Out: 이 피처를 제거했을 때 점수 변화
    const withoutThis = calculateRawFraudScoreExcluding(input, feature.id);
    const contribution = fullScore - withoutThis; // 양수 = 이 피처가 위험 증가에 기여

    return {
      featureName: feature.name,
      featureGroup: feature.group,
      featureValue: value,
      contribution: Math.round(contribution * 100) / 100,
      percentageImpact:
        fullScore > 0
          ? Math.round((Math.abs(contribution) / fullScore) * 100)
          : 0,
      explanation: feature.description(value),
    };
  });
}

/**
 * 원시 사기 위험 점수 계산 (가중합)
 */
function calculateRawFraudScore(input: FraudModelInput): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const feature of FRAUD_FEATURES) {
    const value = feature.extractor(input);
    weightedSum += value * feature.weight;
    totalWeight += feature.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

/**
 * 특정 피처를 제외한 점수 계산 (LOO)
 */
function calculateRawFraudScoreExcluding(
  input: FraudModelInput,
  excludeFeatureId: string,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const feature of FRAUD_FEATURES) {
    if (feature.id === excludeFeatureId) continue;
    const value = feature.extractor(input);
    weightedSum += value * feature.weight;
    totalWeight += feature.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

// ─── 커스텀 가중치 대응 버전 ───

function calculateContributionsWithFeatures(
  input: FraudModelInput,
  features: FraudFeature[],
): FraudFeatureContribution[] {
  const fullScore = calculateRawFraudScoreWithFeatures(input, features);

  return features.map((feature) => {
    const value = feature.extractor(input);
    const withoutThis = calculateRawFraudScoreExcludingWithFeatures(input, features, feature.id);
    const contribution = fullScore - withoutThis;

    return {
      featureName: feature.name,
      featureGroup: feature.group,
      featureValue: value,
      contribution: Math.round(contribution * 100) / 100,
      percentageImpact:
        fullScore > 0
          ? Math.round((Math.abs(contribution) / fullScore) * 100)
          : 0,
      explanation: feature.description(value),
    };
  });
}

function calculateRawFraudScoreWithFeatures(
  input: FraudModelInput,
  features: FraudFeature[],
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const feature of features) {
    const value = feature.extractor(input);
    weightedSum += value * feature.weight;
    totalWeight += feature.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

function calculateRawFraudScoreExcludingWithFeatures(
  input: FraudModelInput,
  features: FraudFeature[],
  excludeFeatureId: string,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const feature of features) {
    if (feature.id === excludeFeatureId) continue;
    const value = feature.extractor(input);
    weightedSum += value * feature.weight;
    totalWeight += feature.weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

// ─── 유사 사례 매칭 ───

interface StoredFraudCase {
  address: string;
  caseType: string;
  amount: number;
  latitude: number;
  longitude: number;
}

function findSimilarCases(
  lat?: number,
  lng?: number,
  cases?: StoredFraudCase[],
  maxDistance: number = 5, // km
): FraudRiskResult["similarCases"] {
  if (!lat || !lng || !cases || cases.length === 0) return [];

  return cases
    .map((c) => {
      const distance = haversineDistance(lat, lng, c.latitude, c.longitude);
      // 유사도 = 1 - (거리 / 최대거리), 0-1
      const similarity = Math.max(0, 1 - distance / maxDistance);
      return {
        address: c.address,
        caseType: c.caseType,
        amount: c.amount,
        distance: Math.round(distance * 100) / 100,
        similarity: Math.round(similarity * 100) / 100,
      };
    })
    .filter((c) => c.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}

/**
 * Haversine 공식 (두 좌표 간 거리, km)
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371; // 지구 반경 km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── 메인 함수: 전세사기 위험 평가 ───

/**
 * 전세사기 위험도 예측
 *
 * 특허 청구항 핵심:
 * (a) 등기부등본으로부터 NLP 모델을 통해 권리관계 피처 추출
 * (b) 공공데이터로부터 시세/전세가율/지역통계 피처 생성
 * (c) 피처 결합하여 앙상블 학습 모델에 입력
 * (d) 사기 확률과 함께 SHAP 기반 변수 기여도 산출
 */
export function predictFraudRisk(
  input: FraudModelInput,
  nearbyFraudCases?: StoredFraudCase[],
  customWeights?: Record<string, number>,
): FraudRiskResult {
  // 커스텀 가중치 적용 (적응형 튜닝에서 로드된 라이브 가중치)
  // 원본 배열을 변경하지 않고, 이번 호출에서만 사용할 피처 복사본 생성
  const features = customWeights
    ? FRAUD_FEATURES.map((f) => ({
        ...f,
        weight: customWeights[f.id] ?? f.weight,
      }))
    : FRAUD_FEATURES;

  // Step 1: 피처 추출 및 기여도 산출
  const contributions = calculateContributionsWithFeatures(input, features);

  // Step 2: 원시 점수 → 보정
  const rawScore = calculateRawFraudScoreWithFeatures(input, features);

  // 비선형 보정: 복수 고위험 피처 존재 시 증폭
  const highRiskFeatures = contributions.filter(
    (c) => c.contribution > 3
  ).length;
  const amplifier = highRiskFeatures >= 3 ? 1.2 : highRiskFeatures >= 2 ? 1.1 : 1.0;
  const adjustedScore = Math.min(100, Math.round(rawScore * amplifier));

  // Step 3: 등급 결정
  const { level, label } = getFraudRiskLevel(adjustedScore);

  // Step 4: 상위 기여도 정렬
  const topRiskFactors = [...contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5);

  // Step 5: 유사 사례 매칭
  const similarCases = findSimilarCases(
    input.latitude,
    input.longitude,
    nearbyFraudCases,
  );

  // Step 6: 권고사항 생성
  const recommendation = generateFraudRecommendation(
    adjustedScore,
    topRiskFactors,
    similarCases.length,
  );

  return {
    fraudScore: adjustedScore,
    riskLevel: level,
    riskLabel: label,
    contributions,
    topRiskFactors,
    similarCases,
    recommendation,
    metadata: {
      modelVersion: "VESTRA-FRAUD-v1.0.0",
      featureCount: FRAUD_FEATURES.length,
      calculatedAt: new Date().toISOString(),
    },
  };
}

/**
 * 위험도 기반 권고사항 생성
 */
function generateFraudRecommendation(
  score: number,
  topFactors: FraudFeatureContribution[],
  nearbyCaseCount: number,
): string {
  const parts: string[] = [];

  if (score >= 80) {
    parts.push("전세사기 위험이 매우 높습니다. 이 물건의 계약을 재고하시기 바랍니다.");
  } else if (score >= 60) {
    parts.push("전세사기 위험이 높습니다. 반드시 전문가 상담 후 진행하세요.");
  } else if (score >= 40) {
    parts.push("전세사기 주의가 필요합니다. 아래 위험요소를 확인하세요.");
  } else {
    parts.push("전세사기 위험도가 낮은 편이나, 기본적인 확인은 필요합니다.");
  }

  // 주요 위험 요인 언급
  const topRisk = topFactors[0];
  if (topRisk && topRisk.contribution > 2) {
    parts.push(`주요 위험요인: ${topRisk.featureName} — ${topRisk.explanation}`);
  }

  // 인근 사례
  if (nearbyCaseCount > 0) {
    parts.push(`인근 ${nearbyCaseCount}건의 전세사기 피해사례가 보고되었습니다.`);
  }

  // 기본 권고
  parts.push("전세보증금반환보증 가입, 전입신고/확정일자 즉시 처리를 권고합니다.");

  return parts.join(" ");
}

// ─── RiskScore에서 피처 자동 추출 ───

/**
 * RiskScore 객체에서 FraudModelInput 피처를 자동 추출
 */
export function extractFeaturesFromRiskScore(
  riskScore: RiskScore,
): Partial<FraudModelInput> {
  const seizureCount = riskScore.factors.filter(
    (f) => f.id.includes("seizure") && !f.id.includes("provisional")
  ).length;
  const provisionalSeizureCount = riskScore.factors.filter(
    (f) => f.id.includes("provisional_seizure")
  ).length;

  return {
    riskScore,
    mortgageRatio: riskScore.mortgageRatio,
    seizureCount,
    provisionalSeizureCount,
  };
}
