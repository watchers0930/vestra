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

// ─── H-1. V-Score 통합 위험도 점수화 ───

export interface VScoreSource {
  id: string;
  name: string;
  score: number;        // 0-100 (개별 소스 점수)
  weight: number;       // 가중치 (합산 = 1.0)
  weightedScore: number; // score × weight
  contribution: number; // 전체 V-Score에 대한 기여도 %
  dataAvailable: boolean;
  details: string;
}

export interface VScoreInteraction {
  sourceA: string;
  sourceB: string;
  interactionType: "amplify" | "mitigate" | "compound";
  adjustment: number; // +/- 점수 보정
  description: string;
}

export interface VScoreExplanation {
  ruleBasedSummary: string;
  naturalLanguage: string;
  topRiskFactors: Array<{
    factor: string;
    impact: number;
    source: string;
  }>;
}

export interface VScoreResult {
  score: number;         // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  sources: VScoreSource[];
  interactions: VScoreInteraction[];
  explanation: VScoreExplanation;
  metadata: {
    version: string;
    calculatedAt: string;
    confidenceLevel: number;
    algorithmId: string;
  };
}

// ─── H-2. 전세사기 예방 위험 평가 ───

export interface FraudFeatureContribution {
  featureName: string;
  featureGroup: "권리관계" | "시세가격" | "임대인" | "건물지역" | "계약조건";
  featureValue: number;
  contribution: number;     // 양수 = 위험↑, 음수 = 안전↑
  percentageImpact: number;
  explanation: string;
}

export interface FraudRiskResult {
  fraudScore: number;        // 0-100 (높을수록 사기 위험)
  riskLevel: "safe" | "caution" | "warning" | "danger" | "critical";
  riskLabel: string;
  contributions: FraudFeatureContribution[];
  topRiskFactors: FraudFeatureContribution[]; // 상위 5개
  similarCases: Array<{
    address: string;
    caseType: string;
    amount: number;
    distance: number;  // km
    similarity: number; // 0-1
  }>;
  recommendation: string;
  metadata: {
    modelVersion: string;
    featureCount: number;
    calculatedAt: string;
  };
}

// ─── H-3. 크로스 기능 연계 시스템 ───

export type AnalysisEventType =
  | "REGISTRY_ANALYZED"
  | "CONTRACT_ANALYZED"
  | "PRICE_PREDICTED"
  | "TAX_CALCULATED"
  | "VSCORE_UPDATED"
  | "FRAUD_ASSESSED"
  | "MONITORING_ALERT";

export interface AnalysisEvent {
  type: AnalysisEventType;
  timestamp: string;
  data: Record<string, unknown>;
  sourceModule: string;
}

export interface CrossAnalysisLink {
  id: string;
  from: string;
  to: string;
  dataFlow: string;
  triggerCondition: string;
  description: string;
}

export interface CrossAnalysisResult {
  links: Array<{
    linkId: string;
    from: string;
    to: string;
    triggered: boolean;
    result?: string;
    impact?: string;
  }>;
  cascadeUpdates: number;
  totalLinksEvaluated: number;
}

// ─── H-4. 부동산 NLP 특화 모델 인터페이스 ───

export type RealEstateEntityType =
  | "소유자"
  | "근저당권자"
  | "임차인"
  | "압류권자"
  | "채권최고액"
  | "설정일"
  | "말소일"
  | "권리종류"
  | "위험요소"
  | "주소"
  | "면적"
  | "용도"
  | "건축년도"
  | "거래금액"
  | "전세금";

export interface NEREntity {
  text: string;
  type: RealEstateEntityType;
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export interface RelationExtraction {
  subject: NEREntity;
  predicate: string;
  object: NEREntity;
  confidence: number;
}

export interface DocumentClassification {
  documentType: "등기부등본" | "매매계약서" | "임대차계약서" | "건축물대장" | "감정평가서" | "기타";
  confidence: number;
  subType?: string;
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
