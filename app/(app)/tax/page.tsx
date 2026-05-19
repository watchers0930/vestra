"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Building2, Home, ArrowRightLeft, GitCompareArrows, FileInput } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { getAnalyses, type AnalysisRecord } from "@/lib/store";
import { calculateAcquisitionTax, calculateHoldingTax, calculateTransferTax } from "@/lib/tax-calculator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { CategoryHero } from "@/components/common/CategoryHero";
import { SliderInput } from "@/components/forms";
import { InfoRow, ScholarPapers } from "@/components/results";
import { useHydrated } from "@/lib/use-hydrated";
import dynamic from "next/dynamic";

const TaxScenarioCompare = dynamic(
  () => import("@/components/tax/TaxScenarioCompare").then((mod) => ({ default: mod.TaxScenarioCompare })),
  { ssr: false, loading: () => <div style={{ height: "256px", borderRadius: "12px", background: "#f5f5f7", animation: "pulse 1.5s infinite" }} /> }
);

type TaxTab = "acquisition" | "holding" | "transfer" | "scenario";

const TAB_COLORS: Record<TaxTab, string> = {
  acquisition: "#0071e3",
  holding: "#10b981",
  transfer: "#f59e0b",
  scenario: "#7c3aed",
};

function HouseCountButtons({ count, setCount, max = 4, color = "#0071e3" }: {
  count: number; setCount: (n: number) => void; max?: number; color?: string;
}) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => setCount(n)}
          aria-pressed={count === n}
          style={{
            flex: 1, padding: "8px 0", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
            border: count === n ? "none" : "1px solid rgba(0,0,0,0.10)",
            background: count === n ? color : "#f5f5f7",
            color: count === n ? "#fff" : "#3d3d3f",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {n >= max ? `${max}+` : n}주택
        </button>
      ))}
    </div>
  );
}

function CheckOption({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
          background: checked ? "#0071e3" : "#f5f5f7",
          border: checked ? "none" : "1px solid rgba(0,0,0,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ fontSize: "13px", color: "#3d3d3f" }}>{label}</span>
    </label>
  );
}

export default function TaxPage() {
  const mounted = useHydrated();
  const [activeTab, setActiveTab] = useState<TaxTab>("acquisition");
  const [contractAnalyses] = useState<AnalysisRecord[]>(() =>
    typeof window === "undefined"
      ? []
      : getAnalyses().filter((a) => a.type === "contract" || a.type === "rights")
  );
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    localStorage.removeItem("vestra_last_address");
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

  const handleImportContract = useCallback((analysis: AnalysisRecord) => {
    const data = analysis.data as Record<string, unknown>;
    const price = (data.dealAmount as number) || (data.price as number) || (data.estimatedPrice as number) || 0;
    if (price > 0) { setAcqPrice(price); setTransAcqPrice(price); }
    setShowImport(false);
  }, []);

  const acqResult = calculateAcquisitionTax({ price: acqPrice, houseCount: acqHouseCount, isAdjusted: acqIsAdjusted, isFirstHome: acqIsFirst });
  const holdResult = calculateHoldingTax({ assessedValue: holdAssessed, houseCount: holdHouseCount, isAdjusted: holdIsAdjusted });
  const transResult = calculateTransferTax({ acquisitionPrice: transAcqPrice, transferPrice: transTransPrice, holdingYears: transHoldYears, livingYears: transLiveYears, houseCount: transHouseCount, isAdjusted: transIsAdjusted });

  const tabs = [
    { id: "acquisition" as TaxTab, label: "취득세", icon: Building2 },
    { id: "holding" as TaxTab, label: "보유세", icon: Home },
    { id: "transfer" as TaxTab, label: "양도세", icon: ArrowRightLeft },
    { id: "scenario" as TaxTab, label: "시나리오 비교", icon: GitCompareArrows },
  ];

  const comparisonData = [
    { name: "취득세", value: acqResult.totalTax || acqResult.tax, fill: "#0071e3" },
    { name: "보유세(연)", value: holdResult.totalTax, fill: "#10b981" },
    { name: "양도세", value: transResult.totalTax || transResult.tax || 0, fill: "#f59e0b" },
  ];

  const cardStyle = { background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px" };
  const sectionGap = { marginBottom: "20px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      <CategoryHero
        badge="✨ 세무 계산기"
        title="세무 시뮬레이션"
        description="취득세 · 보유세 · 양도세 실시간 계산"
        marginBottom="20px"
        actions={contractAnalyses.length > 0 ? (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowImport(!showImport)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", background: "#f7faff", border: "1px solid rgba(104,144,208,0.18)", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#235fb3" }}
            >
              <FileInput size={13} strokeWidth={2} /> 불러오기
            </button>
            {showImport && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 50, background: "#fff", border: "1px solid rgba(0,0,0,0.10)", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.16)", padding: "12px", minWidth: "240px" }}>
                <p style={{ fontSize: "11px", color: "#6e6e73", marginBottom: "8px", padding: "0 4px" }}>최근 분석에서 매매가 불러오기</p>
                {contractAnalyses.slice(0, 5).map((a) => (
                  <button key={a.id} onClick={() => handleImportContract(a)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "10px", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f7"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#1d1d1f", margin: 0 }}>{a.address || "주소 미상"}</p>
                    <p style={{ fontSize: "11px", color: "#6e6e73", margin: "2px 0 0" }}>{a.typeLabel} · {a.date}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : undefined}
      />

      {/* ── 세금 비교 차트 ── */}
      <div id="tax-result" aria-live="polite" style={sectionGap}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>세금 한눈에 비교</h3>
          <div style={{ height: "200px" }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`} style={{ fontSize: "11px" }} />
                  <YAxis type="category" dataKey="name" width={80} style={{ fontSize: "12px" }} />
                  <Tooltip formatter={(value) => [formatKRW(Number(value)), "세액"]} contentStyle={{ borderRadius: "10px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {comparisonData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", width: "100%", borderRadius: "10px", background: "#f5f5f7" }} />
            )}
          </div>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }} role="tablist" aria-label="세금 유형 선택">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = TAB_COLORS[tab.id];
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "12px",
                fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                background: isActive ? color : "#f5f5f7",
                border: isActive ? "none" : "1px solid rgba(0,0,0,0.08)",
                color: isActive ? "#fff" : "#3d3d3f",
                boxShadow: isActive ? `0 4px 12px ${color}40` : "none",
              }}
            >
              <tab.icon size={16} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 취득세 ── */}
      {activeTab === "acquisition" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid-cols-tax">
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Building2 size={18} strokeWidth={1.5} style={{ color: TAB_COLORS.acquisition }} /> 취득세 계산
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <SliderInput label="매매가격" value={acqPrice} onChange={setAcqPrice} min={50000000} max={5000000000} step={10000000} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#1d1d1f", marginBottom: "8px" }}>보유 주택수 (매수 후)</p>
                <HouseCountButtons count={acqHouseCount} setCount={setAcqHouseCount} max={4} color={TAB_COLORS.acquisition} />
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <CheckOption checked={acqIsAdjusted} onChange={setAcqIsAdjusted} label="조정대상지역" />
                <CheckOption checked={acqIsFirst} onChange={setAcqIsFirst} label="생애최초 주택" />
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>계산 결과</h3>
            <div style={{ borderRadius: "12px", background: "linear-gradient(148deg, #0c1527, #141820)", padding: "16px 20px", marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", margin: "0 0 4px" }}>{acqResult.label}</p>
              <p style={{ fontSize: "28px", fontWeight: 700, color: "#fff", margin: 0 }}>{formatKRW(acqResult.totalTax || acqResult.tax)}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <InfoRow label="취득세" value={formatKRW(acqResult.tax)} className="border-b border-border" />
              {acqResult.localEduTax !== undefined && <InfoRow label="지방교육세" value={formatKRW(acqResult.localEduTax)} className="border-b border-border" />}
              {acqResult.specialTax !== undefined && acqResult.specialTax > 0 && <InfoRow label="농어촌특별세" value={formatKRW(acqResult.specialTax)} className="border-b border-border" />}
              <InfoRow label="실효세율" value={`${((acqResult.totalTax || acqResult.tax) / acqPrice * 100).toFixed(2)}%`} />
            </div>
            <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.12)" }}>
              <p style={{ fontSize: "11.5px", color: "#0058b0", margin: 0, lineHeight: 1.6 }}>{acqResult.details}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 보유세 ── */}
      {activeTab === "holding" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid-cols-tax">
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Home size={18} strokeWidth={1.5} style={{ color: TAB_COLORS.holding }} /> 보유세 계산
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <SliderInput label="공시가격" value={holdAssessed} onChange={setHoldAssessed} min={50000000} max={5000000000} step={10000000} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#1d1d1f", marginBottom: "8px" }}>보유 주택수</p>
                <HouseCountButtons count={holdHouseCount} setCount={setHoldHouseCount} max={4} color={TAB_COLORS.holding} />
              </div>
              <CheckOption checked={holdIsAdjusted} onChange={setHoldIsAdjusted} label="조정대상지역" />
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>계산 결과 (연간)</h3>
            <div style={{ borderRadius: "12px", background: "linear-gradient(148deg, #0c2718, #071a0e)", padding: "16px 20px", marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", margin: "0 0 4px" }}>연간 보유세 합계</p>
              <p style={{ fontSize: "28px", fontWeight: 700, color: "#fff", margin: 0 }}>{formatKRW(holdResult.totalTax)}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <InfoRow label="재산세" value={formatKRW(holdResult.propertyTax)} className="border-b border-border" />
              <InfoRow label="종합부동산세" value={formatKRW(holdResult.comprehensiveTax)} className="border-b border-border" />
              <InfoRow label="공제금액" value={formatKRW(holdResult.details.deduction)} className="border-b border-border" />
              <InfoRow label="과세표준" value={formatKRW(holdResult.details.taxableValue)} />
            </div>
            {holdResult.comprehensiveTax === 0 && (
              <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <p style={{ fontSize: "11.5px", color: "#059669", margin: 0, lineHeight: 1.6 }}>공시가격이 공제금액 이하로 종합부동산세가 부과되지 않습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 양도세 ── */}
      {activeTab === "transfer" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid-cols-tax">
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ArrowRightLeft size={18} strokeWidth={1.5} style={{ color: TAB_COLORS.transfer }} /> 양도세 계산
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <SliderInput label="취득가격" value={transAcqPrice} onChange={setTransAcqPrice} min={50000000} max={5000000000} step={10000000} />
              <SliderInput label="양도가격" value={transTransPrice} onChange={setTransTransPrice} min={50000000} max={5000000000} step={10000000} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <SliderInput label="보유기간 (년)" value={transHoldYears} onChange={setTransHoldYears} min={0} max={30} step={1} formatValue={(v) => `${v}년`} />
                <SliderInput label="거주기간 (년)" value={Math.min(transLiveYears, transHoldYears)} onChange={setTransLiveYears} min={0} max={transHoldYears} step={1} formatValue={(v) => `${v}년`} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#1d1d1f", marginBottom: "8px" }}>보유 주택수</p>
                <HouseCountButtons count={transHouseCount} setCount={setTransHouseCount} max={3} color={TAB_COLORS.transfer} />
              </div>
              <CheckOption checked={transIsAdjusted} onChange={setTransIsAdjusted} label="조정대상지역" />
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>계산 결과</h3>
            <div style={{ borderRadius: "12px", background: "linear-gradient(148deg, #1a1200, #0f0900)", padding: "16px 20px", marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", margin: "0 0 4px" }}>양도소득세 합계</p>
              <p style={{ fontSize: "28px", fontWeight: 700, color: "#fff", margin: 0 }}>{formatKRW(transResult.totalTax || transResult.tax || 0)}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <InfoRow label="양도차익" value={formatKRW(transResult.gain || 0)} className="border-b border-border" />
              <InfoRow label="과세표준" value={formatKRW(transResult.taxableGain || 0)} className="border-b border-border" />
              {transResult.deductionRate !== undefined && <InfoRow label="장기보유특별공제" value={`${(transResult.deductionRate * 100).toFixed(0)}%`} className="border-b border-border" />}
              <InfoRow label="양도소득세" value={formatKRW(transResult.tax || 0)} className="border-b border-border" />
              {transResult.localIncomeTax !== undefined && <InfoRow label="지방소득세" value={formatKRW(transResult.localIncomeTax)} />}
            </div>
            <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
              <p style={{ fontSize: "11.5px", color: "#b45309", margin: 0, lineHeight: 1.6 }}>{transResult.details}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 시나리오 비교 ── */}
      {activeTab === "scenario" && (
        <Suspense fallback={<div style={{ height: "256px", borderRadius: "12px", background: "#f5f5f7" }} />}>
          <TaxScenarioCompare />
        </Suspense>
      )}

      <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <PdfDownloadButton targetSelector="#tax-result" filename="vestra-세무시뮬레이션.pdf" title="VESTRA 세무 시뮬레이션" />
      </div>

      <div style={{ marginTop: "32px" }}>
        <ScholarPapers keywords={["부동산 세금", activeTab === "acquisition" ? "취득세" : activeTab === "holding" ? "재산세 종합부동산세" : activeTab === "scenario" ? "세금 비교 시뮬레이션" : "양도소득세"]} />
      </div>

      <div style={{ marginTop: "24px", padding: "16px 20px", borderRadius: "14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
        <p style={{ fontSize: "12px", color: "#92400e", margin: 0, lineHeight: 1.8 }}>
          <strong>면책 조항</strong><br />
          본 세금 계산은 2026년 기준 세법에 따른 참고용 추정치이며, 세무 상담을 대체하지 않습니다.
          개인의 보유 현황, 감면 요건, 지자체 조례 등에 따라 실제 세액과 차이가 있을 수 있습니다.
          정확한 세금 산출은 반드시 세무사와 상담하시기 바랍니다.
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) { .grid-cols-tax { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
