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
  ShieldCheck,
  Info,
  ShieldAlert,
  FileCheck,
  Landmark,
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
import { ScoreGauge, ScholarPapers } from "@/components/results";
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
  dataSource: {
    registryParsed: boolean;
    molitAvailable: boolean;
    estimatedPriceSource: string;
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

      <IntegrityBadge />

      {result.parsed && (
        <Card className="p-6">
          <RightsGraphView parsed={result.parsed} graphAnalysis={result.graphAnalysis} />
        </Card>
      )}

      {rawText && (
        <Card className="p-6">
          <NerHighlight text={rawText} />
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

      {/* 안전 체크리스트 */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileCheck size={18} strokeWidth={1.5} className="text-[#1d1d1f]" />
          거래 전 안전 체크리스트
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <Landmark size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">세금 체납 확인</p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  집주인의 <strong>국세·지방세 완납증명원</strong>을 반드시 요구하세요.
                  체납 세금(당해세)은 근저당보다 <strong>우선 변제</strong>되어 보증금 회수에 직접 영향을 줍니다.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">말소 이력 직접 확인</p>
                <p className="text-xs text-orange-600 mt-1 leading-relaxed">
                  최근 1년 내 근저당이 말소되었다면, 해당 <strong>은행에 직접 전화</strong>하여
                  정상 상환 여부를 확인하세요. 말소 서류 위조로 등기부만 깨끗해진 경우가 있습니다.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">전세보증보험 가입</p>
                <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                  <strong>HUG(주택도시보증공사)</strong> 또는 <strong>SGI(서울보증보험)</strong>의
                  전세보증금반환보증에 반드시 가입하세요. 임대인 부도 시 보증금을 보장합니다.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <Shield size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-800">권원보험 (Title Insurance)</p>
                <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                  소유권 관련 사기·서류 위조·등기 오류로 인한 피해를 보상하는 보험입니다.
                  매매가 3억 기준 일시불 약 <strong>10~15만원</strong>으로 가입 가능합니다.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg md:col-span-2">
            <div className="flex items-start gap-2.5">
              <FileText size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">등기 상태 유지 특약 명시</p>
                <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                  계약서에 <strong>&quot;잔금일까지 현재의 등기 상태를 유지하며, 위반 시 계약 해제 및 배액 배상한다&quot;</strong>는
                  취지의 특약을 반드시 기재하세요. 계약 후 잔금일 전에 근저당 추가, 가압류 등이 발생하는 것을 방지합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ScholarPapers keywords={["부동산 권리분석", "등기부등본", result.propertyInfo.address?.split(" ").slice(0, 2).join(" ") || "부동산"].filter(Boolean)} />

      <Alert variant="warning">
        <strong>면책 조항</strong><br />
        본 분석은 등기부등본 자체 파싱 엔진 + AI 기반의 참고 자료이며, 법적 조언이 아닙니다.
        등기부등본의 정확성은 원본 문서와 대조해 확인하시기 바랍니다.
        부동산 거래 결정 시 반드시 법무사, 공인중개사 등 전문가와 상담하세요.
      </Alert>
    </div>
  );
}
