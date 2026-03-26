"use client";

import { useState, useEffect, useCallback } from "react";
import { Calculator, Building2, Home, ArrowRightLeft, GitCompareArrows, Info, FileInput } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { getAnalyses, type AnalysisRecord } from "@/lib/store";
import {
  calculateAcquisitionTax,
  calculateHoldingTax,
  calculateTransferTax,
} from "@/lib/tax-calculator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PageHeader, Card, Alert } from "@/components/common";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { SliderInput } from "@/components/forms";
import { InfoRow, ScholarPapers } from "@/components/results";
import dynamic from "next/dynamic";

const TaxScenarioCompare = dynamic(
  () => import("@/components/tax/TaxScenarioCompare").then((mod) => ({ default: mod.TaxScenarioCompare })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);

type TaxTab = "acquisition" | "holding" | "transfer" | "scenario";

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState<TaxTab>("acquisition");
  const [contractAnalyses, setContractAnalyses] = useState<AnalysisRecord[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const all = getAnalyses().filter((a) => a.type === "contract" || a.type === "rights");
    setContractAnalyses(all);
    // localStorage에서 주소 정보 정리 (세금 페이지는 주소 입력 없음)
    localStorage.removeItem("vestra_last_address");
  }, []);

  const handleImportContract = useCallback((analysis: AnalysisRecord) => {
    const data = analysis.data as Record<string, unknown>;
    // 계약서/권리분석에서 매매가 추출
    const price = (data.dealAmount as number) || (data.price as number) || (data.estimatedPrice as number) || 0;
    if (price > 0) {
      setAcqPrice(price);
      setTransAcqPrice(price);
    }
    setShowImport(false);
  }, []);

  const [acqPrice, setAcqPrice] = useState(850000000);
  const [acqHouseCount, setAcqHouseCount] = useState(1);
  const [acqIsAdjusted, setAcqIsAdjusted] = useState(false);
  const [acqIsFirst, setAcqIsFirst] = useState(false);

  const [holdAssessed, setHoldAssessed] = useState(600000000);
  const [holdHouseCount, setHoldHouseCount] = useState(1);
  const [holdIsAdjusted, setHoldIsAdjusted] = useState(false);

  const [transAcqPrice, setTransAcqPrice] = useState(600000000);
  const [transTransPrice, setTransTransPrice] = useState(900000000);
  const [transHoldYears, setTransHoldYears] = useState(5);
  const [transLiveYears, setTransLiveYears] = useState(3);
  const [transHouseCount, setTransHouseCount] = useState(1);
  const [transIsAdjusted, setTransIsAdjusted] = useState(false);

  const acqResult = calculateAcquisitionTax({
    price: acqPrice,
    houseCount: acqHouseCount,
    isAdjusted: acqIsAdjusted,
    isFirstHome: acqIsFirst,
  });

  const holdResult = calculateHoldingTax({
    assessedValue: holdAssessed,
    houseCount: holdHouseCount,
    isAdjusted: holdIsAdjusted,
  });

  const transResult = calculateTransferTax({
    acquisitionPrice: transAcqPrice,
    transferPrice: transTransPrice,
    holdingYears: transHoldYears,
    livingYears: transLiveYears,
    houseCount: transHouseCount,
    isAdjusted: transIsAdjusted,
  });

  const tabs = [
    { id: "acquisition" as TaxTab, label: "취득세", icon: Building2 },
    { id: "holding" as TaxTab, label: "보유세", icon: Home },
    { id: "transfer" as TaxTab, label: "양도세", icon: ArrowRightLeft },
    { id: "scenario" as TaxTab, label: "시나리오 비교", icon: GitCompareArrows },
  ];

  const comparisonData = [
    { name: "취득세", value: acqResult.totalTax || acqResult.tax, fill: "#2563eb" },
    { name: "보유세(연)", value: holdResult.totalTax, fill: "#10b981" },
    { name: "양도세", value: transResult.totalTax || transResult.tax || 0, fill: "#f59e0b" },
  ];

  function HouseCountButtons({ count, setCount, max = 4, accent = "primary" }: {
    count: number;
    setCount: (n: number) => void;
    max?: number;
    accent?: string;
  }) {
    const accentStyles: Record<string, string> = {
      primary: "bg-primary text-white border-primary",
      emerald: "bg-emerald-500 text-white border-emerald-500",
      amber: "bg-amber-500 text-white border-amber-500",
    };
    return (
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            aria-pressed={count === n}
            aria-label={`${n >= max ? `${max}채 이상` : `${n}채`} 주택`}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
              count === n
                ? accentStyles[accent]
                : "bg-white text-secondary border-border hover:bg-gray-50"
            )}
          >
            {n >= max ? `${max}+` : n}주택
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={Calculator} title="세무 시뮬레이션" description="취득세 · 보유세 · 양도세 실시간 계산" />

      {/* 계약에서 가져오기 */}
      {contractAnalyses.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowImport(!showImport)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            <FileInput size={16} strokeWidth={1.5} />
            계약/분석에서 가져오기
          </button>
          {showImport && (
            <div className="mt-2 rounded-xl border border-[#e5e5e7] bg-white p-3 space-y-2">
              <p className="text-xs text-[#6e6e73] mb-2">최근 분석 결과에서 매매가를 불러옵니다</p>
              {contractAnalyses.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleImportContract(a)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
                >
                  <p className="text-sm font-medium text-[#1d1d1f]">{a.address || "주소 미상"}</p>
                  <p className="text-xs text-[#6e6e73]">{a.typeLabel} · {a.date}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tax Comparison Chart */}
      <div id="tax-result" aria-live="polite">
      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4">세금 비교</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip formatter={(value) => [formatKRW(Number(value)), "세액"]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="세금 유형 선택">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-white shadow-md"
                : "bg-card text-secondary border border-border hover:bg-gray-50"
            )}
          >
            <tab.icon size={18} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 취득세 */}
      {activeTab === "acquisition" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 size={20} strokeWidth={1.5} className="text-[#1d1d1f]" />
              취득세 계산
            </h3>
            <div className="space-y-5">
              <SliderInput
                label="매매가격"
                value={acqPrice}
                onChange={setAcqPrice}
                min={50000000}
                max={5000000000}
                step={10000000}
              />
              <div>
                <label className="block text-sm font-medium mb-2">보유 주택수 (매수 후)</label>
                <HouseCountButtons count={acqHouseCount} setCount={setAcqHouseCount} max={4} accent="primary" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={acqIsAdjusted} onChange={(e) => setAcqIsAdjusted(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm">조정대상지역</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={acqIsFirst} onChange={(e) => setAcqIsFirst(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm">생애최초 주택</span>
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">계산 결과</h3>
            <div className="space-y-4">
              <div className="bg-[#f5f5f7] rounded-lg p-4">
                <div className="text-sm text-[#1d1d1f] mb-1">{acqResult.label}</div>
                <div className="text-3xl font-bold text-[#1d1d1f]">{formatKRW(acqResult.totalTax || acqResult.tax)}</div>
              </div>
              <div className="space-y-2 text-sm">
                <InfoRow label="취득세" value={formatKRW(acqResult.tax)} className="border-b border-border" />
                {acqResult.localEduTax !== undefined && (
                  <InfoRow label="지방교육세" value={formatKRW(acqResult.localEduTax)} className="border-b border-border" />
                )}
                {acqResult.specialTax !== undefined && acqResult.specialTax > 0 && (
                  <InfoRow label="농어촌특별세" value={formatKRW(acqResult.specialTax)} className="border-b border-border" />
                )}
                <InfoRow label="실효세율" value={`${((acqResult.totalTax || acqResult.tax) / acqPrice * 100).toFixed(2)}%`} />
              </div>
              <Alert variant="info">
                <span className="text-xs">{acqResult.details}</span>
              </Alert>
            </div>
          </Card>
        </div>
      )}

      {/* 보유세 */}
      {activeTab === "holding" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Home size={20} strokeWidth={1.5} className="text-[#1d1d1f]" />
              보유세 계산
            </h3>
            <div className="space-y-5">
              <SliderInput
                label="공시가격"
                value={holdAssessed}
                onChange={setHoldAssessed}
                min={50000000}
                max={5000000000}
                step={10000000}
              />
              <div>
                <label className="block text-sm font-medium mb-2">보유 주택수</label>
                <HouseCountButtons count={holdHouseCount} setCount={setHoldHouseCount} max={4} accent="emerald" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={holdIsAdjusted} onChange={(e) => setHoldIsAdjusted(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm">조정대상지역</span>
              </label>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">계산 결과 (연간)</h3>
            <div className="space-y-4">
              <div className="bg-[#f5f5f7] rounded-lg p-4">
                <div className="text-sm text-[#1d1d1f] mb-1">연간 보유세 합계</div>
                <div className="text-3xl font-bold text-[#1d1d1f]">{formatKRW(holdResult.totalTax)}</div>
              </div>
              <div className="space-y-2 text-sm">
                <InfoRow label="재산세" value={formatKRW(holdResult.propertyTax)} className="border-b border-border" />
                <InfoRow label="종합부동산세" value={formatKRW(holdResult.comprehensiveTax)} className="border-b border-border" />
                <InfoRow label="공제금액" value={formatKRW(holdResult.details.deduction)} className="border-b border-border" />
                <InfoRow label="과세표준" value={formatKRW(holdResult.details.taxableValue)} />
              </div>
              {holdResult.comprehensiveTax === 0 && (
                <Alert variant="info">
                  <span className="text-xs">공시가격이 공제금액 이하로 종합부동산세가 부과되지 않습니다.</span>
                </Alert>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 양도세 */}
      {activeTab === "transfer" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} strokeWidth={1.5} className="text-[#1d1d1f]" />
              양도세 계산
            </h3>
            <div className="space-y-5">
              <SliderInput
                label="취득가격"
                value={transAcqPrice}
                onChange={setTransAcqPrice}
                min={50000000}
                max={5000000000}
                step={10000000}
              />
              <SliderInput
                label="양도가격"
                value={transTransPrice}
                onChange={setTransTransPrice}
                min={50000000}
                max={5000000000}
                step={10000000}
              />
              <div className="grid grid-cols-2 gap-4">
                <SliderInput
                  label="보유기간 (년)"
                  value={transHoldYears}
                  onChange={setTransHoldYears}
                  min={0}
                  max={30}
                  step={1}
                  formatValue={(v) => `${v}년`}
                />
                <SliderInput
                  label="거주기간 (년)"
                  value={Math.min(transLiveYears, transHoldYears)}
                  onChange={setTransLiveYears}
                  min={0}
                  max={transHoldYears}
                  step={1}
                  formatValue={(v) => `${v}년`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">보유 주택수</label>
                <HouseCountButtons count={transHouseCount} setCount={setTransHouseCount} max={3} accent="amber" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={transIsAdjusted} onChange={(e) => setTransIsAdjusted(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                <span className="text-sm">조정대상지역</span>
              </label>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">계산 결과</h3>
            <div className="space-y-4">
              <div className="bg-[#f5f5f7] rounded-lg p-4">
                <div className="text-sm text-[#1d1d1f] mb-1">양도소득세 합계</div>
                <div className="text-3xl font-bold text-[#1d1d1f]">{formatKRW(transResult.totalTax || transResult.tax || 0)}</div>
              </div>
              <div className="space-y-2 text-sm">
                <InfoRow label="양도차익" value={formatKRW(transResult.gain || 0)} className="border-b border-border" />
                <InfoRow label="과세표준" value={formatKRW(transResult.taxableGain || 0)} className="border-b border-border" />
                {transResult.deductionRate !== undefined && (
                  <InfoRow label="장기보유특별공제" value={`${(transResult.deductionRate * 100).toFixed(0)}%`} className="border-b border-border" />
                )}
                <InfoRow label="양도소득세" value={formatKRW(transResult.tax || 0)} className="border-b border-border" />
                {transResult.localIncomeTax !== undefined && (
                  <InfoRow label="지방소득세" value={formatKRW(transResult.localIncomeTax)} />
                )}
              </div>
              <Alert variant="info">
                <span className="text-xs">{transResult.details}</span>
              </Alert>
            </div>
          </Card>
        </div>
      )}
      {/* 시나리오 비교 */}
      {activeTab === "scenario" && <TaxScenarioCompare />}
      </div>

      <div className="mt-4 flex justify-end">
        <PdfDownloadButton targetSelector="#tax-result" filename="vestra-세무시뮬레이션.pdf" title="VESTRA 세무 시뮬레이션" />
      </div>

      {/* 관련 학술논문 */}
      <div className="mt-8">
        <ScholarPapers keywords={[
          "부동산 세금",
          activeTab === "acquisition" ? "취득세" : activeTab === "holding" ? "재산세 종합부동산세" : activeTab === "scenario" ? "세금 비교 시뮬레이션" : "양도소득세",
        ]} />
      </div>

      {/* 면책 조항 */}
      <Alert variant="warning" className="mt-8">
        <strong>면책 조항</strong><br />
        본 세금 계산은 2026년 기준 세법에 따른 참고용 추정치이며, 세무 상담을 대체하지 않습니다.
        개인의 보유 현황, 감면 요건, 지자체 조례 등에 따라 실제 세액과 차이가 있을 수 있습니다.
        정확한 세금 산출은 반드시 세무사와 상담하시기 바랍니다.
      </Alert>
    </div>
  );
}
