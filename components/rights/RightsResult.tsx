"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
} from "lucide-react";
import { formatKRW, cn } from "@/lib/utils";
import type { ParsedRegistry } from "@/lib/registry-parser";
import type { RiskScore } from "@/lib/risk-scoring";
import type { ValidationResult } from "@/lib/validation-engine";
import { Card, Alert } from "@/components/common";
import { ChecklistSection } from "@/components/common/ChecklistSection";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { IntegrityBadge } from "@/components/common/IntegrityBadge";
import { NerHighlight } from "@/components/common/NerHighlight";
import { StructuredRegistryView } from "@/components/rights/StructuredRegistryView";
import { SafetyChecklist } from "@/components/rights/SafetyChecklist";
import { ScoreGauge, ScholarPapers } from "@/components/results";
import { KaptInfoCard, type KaptInfoData } from "@/components/common/KaptInfoCard";
import SafetyDiagnosisCard from "@/components/results/SafetyDiagnosisCard";
import TitleInsuranceCard from "@/components/results/TitleInsuranceCard";
import ContractClauseCard from "@/components/results/ContractClauseCard";
import dynamic from "next/dynamic";

const RightsGraphView = dynamic(
  () => import("@/components/rights/RightsGraphView").then((mod) => ({ default: mod.RightsGraphView })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-gray-100 rounded-xl" /> }
);
import type { KakaoGeocoderResult } from "@/components/prediction/KakaoMap";

// ─── 타입 ───

type AddressTab = "admin" | "jibun" | "road";

interface AddressInfo {
  admin: string;
  jibun: string;
  road: string;
  zipCode: string;
}

interface RiskItem {
  level: "danger" | "warning" | "safe";
  title: string;
  description: string;
}

export interface UnifiedResult {
  propertyInfo: {
    address: string;
    type: string;
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
  };
  parsed: ParsedRegistry;
  validation: ValidationResult;
  riskScore: RiskScore;
  marketData: {
    sale: { avgPrice: number; transactionCount: number } | null;
    rent: { avgDeposit: number; jeonseCount: number } | null;
    jeonseRatio: number | null;
  } | null;
  aiOpinion: string;
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
  // 임시 디버그
  _debug?: {
    sectionLengths?: { title: number; gapgu: number; eulgu: number };
    eulguRawPreview?: string;
    eulguEntries?: Array<{ order: number; purpose: string; isCancelled: boolean; amount: number; detailPreview: string }>;
    inputLength?: number;
    inputFirst200?: string;
    hasHtmlMarker?: boolean;
  };
}

// ─── 스타일 상수 ───

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "치명" },
  high: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "고위험" },
  medium: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "주의" },
  low: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "참고" },
};

const RISK_CONFIG = {
  danger: { bg: "bg-red-50 border-red-200", text: "text-red-700", descText: "text-red-600", icon: XCircle, iconColor: "text-red-500" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", descText: "text-amber-600", icon: AlertTriangle, iconColor: "text-amber-500" },
  safe: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", descText: "text-emerald-600", icon: CheckCircle, iconColor: "text-emerald-500" },
};

function getScoreLabel(score: number) {
  if (score >= 70) return "안전";
  if (score >= 40) return "주의";
  return "위험";
}

// ─── 컴포넌트 ───

interface RightsResultProps {
  result: UnifiedResult;
  rawText: string;
}

export function RightsResult({ result, rawText }: RightsResultProps) {
  const resultRef = useRef<HTMLDivElement>(null);
  const [addressTab, setAddressTab] = useState<AddressTab>("admin");
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [showGapgu, setShowGapgu] = useState(false);
  const [showEulgu, setShowEulgu] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [registryViewTab, setRegistryViewTab] = useState<"structured" | "raw">("structured");

  const propertyAddress = result?.propertyInfo?.address;

  useEffect(() => {
    if (!propertyAddress) return;

    const address = propertyAddress;

    const geocode = () => {
      if (!window.kakao?.maps) return;

      window.kakao.maps.load(() => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (results: KakaoGeocoderResult[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && results[0]) {
            const r = results[0];
            setAddressInfo({
              admin: r.address
                ? `${r.address.region_1depth_name} ${r.address.region_2depth_name} ${r.address.region_3depth_h_name}`
                : address,
              jibun: r.address?.address_name || address,
              road: r.road_address?.address_name || "-",
              zipCode: r.road_address?.zone_no || "-",
            });
          } else {
            setAddressInfo({ admin: address, jibun: address, road: "-", zipCode: "-" });
          }
        });
      });
    };

    if (window.kakao?.maps) {
      geocode();
    } else {
      const timeout = setTimeout(() => {
        if (window.kakao?.maps) {
          geocode();
        } else {
          setAddressInfo({ admin: address, jibun: address, road: "-", zipCode: "-" });
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [propertyAddress]);

  return (
    <div ref={resultRef} className="space-y-6">
      {/* 결과 상단 액션 */}
      <div className="flex items-center justify-between">
        <AiDisclaimer compact />
        <PdfDownloadButton targetRef={resultRef} filename="vestra-rights-analysis.pdf" title="VESTRA 권리분석 리포트" />
      </div>

      {/* 안전도 점수 + 핵심 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">안전도 점수</h3>
          <ScoreGauge score={result.riskAnalysis.safetyScore} size="lg" grade={getScoreLabel(result.riskAnalysis.safetyScore)} showLabel={false} />
          <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center">
            <div>
              <p className="text-xs text-gray-400">근저당비율</p>
              <p className="text-lg font-bold text-gray-900">{result.riskAnalysis.mortgageRatio.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">전세가율</p>
              <p className="text-lg font-bold text-gray-900">{result.riskAnalysis.jeonseRatio}%</p>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            <span className="px-2 py-0.5 text-[9px] rounded-full bg-emerald-100 text-emerald-700">등기부등본 실제 데이터</span>
            {result.dataSource?.molitAvailable && (
              <span className="px-2 py-0.5 text-[9px] rounded-full bg-blue-100 text-blue-700">MOLIT 실거래</span>
            )}
          </div>
        </Card>

        {/* 위험 분석 항목 */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">위험 분석 항목 ({result.riskAnalysis.risks.length}건)</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {result.riskAnalysis.risks.length > 0 ? result.riskAnalysis.risks.map((risk, i) => {
              const c = RISK_CONFIG[risk.level];
              const Icon = c.icon;
              return (
                <div key={i} className={cn("flex items-start gap-3 rounded-lg border p-3", c.bg)}>
                  <Icon size={16} className={cn("mt-0.5 flex-shrink-0", c.iconColor)} />
                  <div>
                    <p className={cn("text-sm font-medium", c.text)}>{risk.title}</p>
                    <p className={cn("text-xs mt-0.5", c.descText)}>{risk.description}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle size={16} className="text-emerald-500" />
                <p className="text-sm text-emerald-700">특별한 위험 요소가 발견되지 않았습니다</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 8대 안전진단 */}
      {result.safetyDiagnosis && (
        <SafetyDiagnosisCard result={result.safetyDiagnosis} />
      )}

      {/* 권원보험 안내 */}
      {result.titleInsurance && (
        <TitleInsuranceCard result={result.titleInsurance} />
      )}

      {/* 매매계약 특약 */}
      {result.contractClauses && (
        <ContractClauseCard result={result.contractClauses} />
      )}

      {/* 맞춤 준비 체크리스트 */}
      {result.checklistByCategory && Object.keys(result.checklistByCategory).length > 0 && (
        <ChecklistSection checklistByCategory={result.checklistByCategory} />
      )}

      {/* 부동산 기본정보 */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={18} strokeWidth={1.5} className="text-[#1d1d1f]" />
          부동산 기본정보
        </h2>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-gray-400">주소</p>
              {addressInfo && (
                <div className="flex gap-1">
                  {([
                    { key: "admin" as AddressTab, label: "행정동" },
                    { key: "jibun" as AddressTab, label: "지번" },
                    { key: "road" as AddressTab, label: "도로명" },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setAddressTab(tab.key)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] rounded-md border transition-all",
                        addressTab === tab.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900">
              {addressInfo ? addressInfo[addressTab] : (result.propertyInfo.address || "-")}
            </p>
            {addressInfo?.zipCode && addressInfo.zipCode !== "-" && (
              <p className="text-[11px] text-gray-400 mt-1">우편번호: {addressInfo.zipCode}</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-400 mb-1">건물유형</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.type || "-"}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">전용면적</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.area || "-"}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">추정 시세</p><p className="text-sm font-bold text-blue-600">{result.propertyInfo.estimatedPrice ? formatKRW(result.propertyInfo.estimatedPrice) : "-"}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">전세 시세</p><p className="text-sm font-bold text-emerald-600">{result.propertyInfo.jeonsePrice ? formatKRW(result.propertyInfo.jeonsePrice) : "-"}</p></div>
            {result.propertyInfo.recentTransaction && (
              <div><p className="text-xs text-gray-400 mb-1">최근 거래</p><p className="text-sm font-medium text-gray-900">{result.propertyInfo.recentTransaction}</p></div>
            )}
          </div>
        </div>
      </Card>

      {result.kaptInfo && <KaptInfoCard kaptInfo={result.kaptInfo} />}

      <IntegrityBadge />

      {result.parsed && (
        <Card className="p-6">
          <RightsGraphView parsed={result.parsed} graphAnalysis={result.graphAnalysis} />
        </Card>
      )}

      {rawText && result.parsed && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} strokeWidth={1.5} className="text-[#1d1d1f]" />
            <h3 className="text-sm font-semibold text-gray-900">등기부등본</h3>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setRegistryViewTab("structured")}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-all",
                  registryViewTab === "structured"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
                )}
              >
                구조화 보기
              </button>
              <button
                onClick={() => setRegistryViewTab("raw")}
                className={cn(
                  "px-3 py-1 text-xs rounded-md border transition-all",
                  registryViewTab === "raw"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
                )}
              >
                원문 보기
              </button>
            </div>
          </div>
          {registryViewTab === "structured" ? (
            <StructuredRegistryView parsed={result.parsed} />
          ) : (
            <NerHighlight text={rawText} />
          )}
        </Card>
      )}

      {/* 갑구 */}
      {result.parsed?.gapgu?.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <button onClick={() => setShowGapgu(!showGapgu)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              갑구 (소유권) <span className="text-xs font-normal text-gray-400">{result.parsed.gapgu.length}건</span>
            </h3>
            {showGapgu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showGapgu && (
            <div className="px-4 pb-4 space-y-2">
              {result.parsed.gapgu.map((entry, i) => (
                <div key={i} className={cn("p-3 rounded-lg border text-xs", entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200 line-through" : "bg-white border-border")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-gray-400">#{entry.order}</span>
                    <span className="font-medium">{entry.purpose}</span>
                    <span className="text-gray-400">{entry.date}</span>
                    {entry.isCancelled && <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">말소</span>}
                  </div>
                  <p className="text-gray-600">{entry.holder}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 을구 */}
      {result.parsed?.eulgu?.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <button onClick={() => setShowEulgu(!showEulgu)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              을구 (근저당/전세권) <span className="text-xs font-normal text-gray-400">{result.parsed.eulgu.length}건</span>
            </h3>
            {showEulgu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showEulgu && (
            <div className="px-4 pb-4 space-y-2">
              {result.parsed.eulgu.map((entry, i) => (
                <div key={i} className={cn("p-3 rounded-lg border text-xs", entry.isCancelled ? "opacity-50 bg-gray-50 border-gray-200 line-through" : "bg-white border-border")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-gray-400">#{entry.order}</span>
                    <span className="font-medium">{entry.purpose}</span>
                    <span className="text-gray-400">{entry.date}</span>
                    {entry.amount > 0 && <span className="text-blue-600 font-medium">{formatKRW(entry.amount)}</span>}
                    {entry.isCancelled && <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">말소</span>}
                  </div>
                  <p className="text-gray-600">{entry.holder}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 검증 결과 */}
      {result.validation?.issues?.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <button onClick={() => setShowValidation(!showValidation)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              검증 결과
              <span className="text-xs font-normal text-gray-400">
                {result.validation.issues.filter((i) => i.severity === "error").length}오류 /
                {result.validation.issues.filter((i) => i.severity === "warning").length}경고
              </span>
            </h3>
            {showValidation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showValidation && (
            <div className="px-4 pb-4 space-y-2">
              {result.validation.issues.map((issue, i) => (
                <div key={i} className={cn("p-3 rounded-lg border text-xs", SEVERITY_STYLES[issue.severity]?.bg || "bg-gray-50")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", SEVERITY_STYLES[issue.severity]?.text || "")}>{SEVERITY_STYLES[issue.severity]?.label || issue.severity}</span>
                    <span className="font-medium">{issue.field}</span>
                  </div>
                  <p className={cn(SEVERITY_STYLES[issue.severity]?.text || "text-gray-600")}>{issue.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* AI 종합 의견 */}
      <div className="bg-[#f5f5f7] rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={20} strokeWidth={1.5} className="text-[#1d1d1f]" />
          <h3 className="text-lg font-semibold text-gray-900">AI 종합 의견</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{result.aiOpinion}</p>
      </div>

      {/* 공신력 부재 경고 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-2">등기부등본의 한계: 공신력 부재</h3>
            <p className="text-xs leading-relaxed text-amber-700">
              대한민국 등기부등본에는 법적 <strong>&apos;공신력&apos;</strong>이 없습니다.
              등기부는 정보를 공개(공시)할 뿐, 그 내용이 실제와 다르더라도 이를 믿고 거래한 사람을 국가가 완벽히 보호하지 않습니다.
              서류 위조 등으로 잘못 기재된 등기를 믿고 계약했더라도 진정한 권리자가 나타나면 매수인이 손해를 볼 수 있습니다.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
              <Info size={12} />
              <span>반드시 <strong>&apos;말소 사항 포함&apos;</strong>으로 등기부를 발급받아 과거 이력까지 확인하세요.</span>
            </div>
          </div>
        </div>
      </div>

      <SafetyChecklist />

      <ScholarPapers keywords={["부동산 권리분석", "등기부등본", result.propertyInfo.address?.split(" ").slice(0, 2).join(" ") || "부동산"].filter(Boolean)} />

      <Alert variant="warning">
        <strong>면책 조항</strong><br />
        본 분석은 등기부등본 자체 파싱 엔진 + AI 기반의 참고 자료이며, 법적 조언이 아닙니다.
        등기부등본의 정확성은 원본 문서와 대조해 확인하시기 바랍니다.
        부동산 거래 결정 시 반드시 법무사, 공인중개사 등 전문가와 상담하세요.
      </Alert>

      {/* 임시 디버그 패널 — 파싱 진단용 (추후 제거) */}
      {result._debug && (
        <details className="mt-4 border border-gray-200 rounded-lg text-xs">
          <summary className="px-3 py-2 bg-gray-50 cursor-pointer font-mono text-gray-500">
            [DEV] 파싱 디버그 (클릭하여 펼치기)
          </summary>
          <div className="p-3 space-y-2 font-mono text-gray-600 overflow-auto max-h-96">
            <p><strong>입력 길이:</strong> {result._debug.inputLength}자 | HTML 말소 마커: {result._debug.hasHtmlMarker ? "있음" : "없음"}</p>
            <p><strong>섹션:</strong> 표제부={result._debug.sectionLengths?.title} | 갑구={result._debug.sectionLengths?.gapgu} | 을구={result._debug.sectionLengths?.eulgu}</p>
            <div>
              <strong>을구 항목 ({result._debug.eulguEntries?.length || 0}건):</strong>
              {result._debug.eulguEntries?.map((e, i) => (
                <div key={i} className={`mt-1 p-1.5 rounded ${e.isCancelled ? "bg-green-50" : "bg-red-50"}`}>
                  #{e.order} {e.purpose} | {e.isCancelled ? "말소" : "활성"} | {e.amount.toLocaleString()}원
                  <br />
                  <span className="text-gray-400">{e.detailPreview}</span>
                </div>
              ))}
            </div>
            <div>
              <strong>을구 원문 (첫 800자):</strong>
              <pre className="mt-1 p-2 bg-gray-100 rounded whitespace-pre-wrap text-[10px]">{result._debug.eulguRawPreview || "(없음)"}</pre>
            </div>
            <div>
              <strong>입력 텍스트 (첫 200자):</strong>
              <pre className="mt-1 p-2 bg-gray-100 rounded whitespace-pre-wrap text-[10px]">{result._debug.inputFirst200}</pre>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
