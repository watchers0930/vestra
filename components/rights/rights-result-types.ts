/**
 * RightsResult 공용 타입
 *
 * 통합 권리분석 결과(UnifiedResult)와 부속 타입.
 * UnifiedResult는 여러 화면(useRightsAnalysis·RegistryAnalysisModal·renewal 등)에서
 * import하므로 타입만 별도 파일로 분리한다.
 */
import type { ParsedRegistry } from "@/lib/registry-parser";
import type { RiskScore } from "@/lib/risk-scoring";
import type { ValidationResult } from "@/lib/validation-engine";
import type { SourceCitation } from "@/lib/analysis-sources";
import type { KaptInfoData } from "@/components/common/KaptInfoCard";
import type { VScoreResult } from "@/lib/patent-types";

export type AddressTab = "admin" | "jibun" | "road";

export interface AddressInfo {
  admin: string;
  jibun: string;
  road: string;
  zipCode: string;
}

export interface RiskItem {
  level: "danger" | "warning" | "safe";
  title: string;
  description: string;
}

export interface UnifiedResult {
  propertyInfo: {
    address: string;
    /** 동·호수 (표제부에서 분리 추출, ⑦). address와 중복 없이 조합 표시 */
    unitNumber?: string;
    /** 고유 물건 식별자 (있으면 이력 비교 매칭에 우선 사용, ③) */
    propUid?: string;
    type: string;
    /** 전유부분 우선 면적 표시값 (⑥). 미확인이면 "" */
    area: string;
    buildYear: string;
    estimatedPrice: number;
    jeonsePrice: number;
    recentTransaction: string;
  };
  riskAnalysis: {
    jeonseRatio: number;
    mortgageRatio: number;
    safetyScore: number;
    riskScore: number;
    risks: RiskItem[];
    /**
     * 권리분석 가능 여부. 등기부 미제출·파싱 실패·소유자 미확인 등으로
     * 유효한 권리 데이터가 없으면 false → 안전점수·등급을 산출/표시하지 않는다.
     * (데이터 부재를 "안전"으로 오인시키는 허위 안심 방지)
     */
    analyzable?: boolean;
    /** analyzable === false일 때 사용자에게 보여줄 사유·안내 문구 */
    unavailableReason?: string;
  };
  parsed: ParsedRegistry;
  validation: ValidationResult;
  riskScore: RiskScore;
  marketData: {
    sale: { avgPrice: number; transactionCount: number } | null;
    rent: { avgDeposit: number; jeonseCount: number } | null;
    jeonseRatio: number | null;
  } | null;
  /** V-Score 5축 평가 결과 (② 설명 패널 표시용). 분석 불가·레거시 이력엔 없을 수 있음 */
  vScore?: VScoreResult;
  aiOpinion: string;
  qualityGate?: {
    accuracy: number;
    grounding: number;
    completeness: number;
    overall: number;
    pass: boolean;
    status: "judged" | "skipped";
    regenerated: boolean;
  } | null;
  sources?: SourceCitation[];
  graphAnalysis?: {
    graph: { nodeCount: number; edgeCount: number; maxDepth: number };
    cycles: { hasCycle: boolean; cycles: Array<{ path: string[]; riskScore: number; description: string }> };
    riskPropagation: {
      nodeRisks: Record<string, number>;
      propagationSteps: Array<{ from: string; to: string; riskDelta: number; iteration: number }>;
      convergenceIterations: number;
      totalSystemRisk: number;
    };
    chainAnalysis: { chains: Array<{ id: string; nodes: string[]; totalAmount: number; riskLevel: string; description: string }>; longestChain: number; maxChainAmount: number };
    criticalPath: { path: string[]; totalRisk: number; maxLossAmount: number; description: string };
    clusterAnalysis: { clusters: Array<{ id: number; nodes: string[]; internalRisk: number; connectedTo: number[] }>; isolatedNodes: string[] };
  };
  checklist?: import("@/lib/checklist-generator").ChecklistItem[];
  checklistByCategory?: Record<string, import("@/lib/checklist-generator").ChecklistItem[]>;
  kaptInfo?: KaptInfoData | null;
  safetyDiagnosis?: import("@/lib/safety-diagnosis").SafetyDiagnosisResult;
  titleInsurance?: import("@/lib/title-insurance").TitleInsuranceResult | null;
  contractClauses?: import("@/lib/contract-clause-generator").ContractClauseResult;
  dataSource: {
    registryParsed: boolean;
    molitAvailable: boolean;
    estimatedPriceSource: string;
  };
}
