/**
 * VESTRA 특허 기술 타입 정의
 * ──────────────────────────
 * 특허 청구항 경계를 명확히 하기 위한 독립 타입 모듈.
 * 모든 강화 알고리즘의 입출력 인터페이스를 정의.
 */

// ─── A. 위험요소 상호작용 매트릭스 ───

export interface RiskInteractionRule {
  id: string;
  factors: string[];
  amplifier: number;
  description: string;
  rationale: string;
}

export interface RiskInteractionResult {
  appliedRules: Array<{
    ruleId: string;
    matchedFactors: string[];
    baseDeduction: number;
    amplifiedDeduction: number;
    additionalDeduction: number;
    description: string;
  }>;
  totalInteractionPenalty: number;
}

// ─── B. 경매 배당 시뮬레이터 ───

export interface ClaimPriority {
  order: number;
  type: "근저당" | "전세권" | "임차권" | "압류" | "가압류";
  holder: string;
  amount: number;
  date: string;
  isPreferential: boolean;
}

export interface AuctionScenario {
  auctionPriceRatio: number;
  auctionPrice: number;
  distributions: Array<{
    claimOrder: number;
    holder: string;
    claimAmount: number;
    recoveredAmount: number;
    recoveryRate: number;
    shortfall: number;
  }>;
  tenantDeposit: number;
  tenantRecovery: number;
  tenantRecoveryRate: number;
}

export interface RedemptionSimulationResult {
  claims: ClaimPriority[];
  scenarios: AuctionScenario[];
  worstCaseRecovery: number;
  bestCaseRecovery: number;
  recommendation: string;
}

// ─── C. 신뢰도 전파 프레임워크 ───

export interface StageConfidence {
  stage: string;
  confidence: number;
  factors: Array<{
    name: string;
    value: number;
    weight: number;
  }>;
  dataQuality: "high" | "medium" | "low";
}

export interface ConfidencePropagationResult {
  stages: StageConfidence[];
  compositeReliability: number;
  trustChain: Array<{
    from: string;
    to: string;
    propagatedConfidence: number;
  }>;
  bottleneck: {
    stage: string;
    confidence: number;
    reason: string;
  };
}

// ─── D. 다중 모델 앙상블 예측 ───

export interface ModelResult {
  modelName: string;
  prediction: { "1y": number; "5y": number; "10y": number };
  r2: number;
  weight: number;
}

export interface EnsemblePredictionResult {
  models: ModelResult[];
  ensemble: { "1y": number; "5y": number; "10y": number };
  dominantModel: string;
  modelAgreement: number;
}

// ─── E. 시계열 이상 패턴 탐지 ───

export interface TemporalPattern {
  id: string;
  patternType: "rapid_transfer" | "pre_seizure_mortgage" | "claim_acceleration" | "mortgage_stacking" | "suspicious_cancellation" | "cancel_before_sale" | "simultaneous_cancellation" | "cancel_without_transfer";
  severity: "critical" | "high" | "medium";
  confidence: number;
  description: string;
  evidence: Array<{
    date: string;
    event: string;
  }>;
  timespan: {
    startDate: string;
    endDate: string;
    durationMonths: number;
  };
}

export interface TemporalRiskResult {
  patterns: TemporalPattern[];
  overallTemporalRisk: number;
  timelineAnomalyScore: number;
}

// ─── F. 계약조항 상호작용 분석 ───

export interface ClauseInteractionRule {
  id: string;
  clauseIds: string[];
  interactionType: "compound_warning" | "imbalanced" | "contradictory";
  impactMultiplier: number;
  description: string;
}

export interface ClauseInteractionResult {
  interactions: Array<{
    ruleId: string;
    matchedClauses: string[];
    impactScore: number;
    description: string;
  }>;
  totalInteractionImpact: number;
}

// ─── G. 헤도닉 가격 분해 ───

export interface HedonicComponent {
  component: "location" | "age" | "floor" | "area" | "residual";
  value: number;
  percentage: number;
  adjustmentFormula: string;
}

export interface HedonicDecompositionResult {
  components: HedonicComponent[];
  reconstructedPrice: number;
  decompositionConfidence: number;
  locationPremiumIndex: number;
}

// ─── H. 자기검증 루프 ───

export interface VerificationCheck {
  checkId: string;
  description: string;
  aiValue: string | number;
  deterministicValue: string | number;
  isConsistent: boolean;
  discrepancyLevel: "none" | "minor" | "major";
  discrepancyDetail?: string;
}

export interface SelfVerificationResult {
  checks: VerificationCheck[];
  overallConsistency: number;
  discrepancyCount: number;
  compositeReliability: number;
  recommendation: string;
}
