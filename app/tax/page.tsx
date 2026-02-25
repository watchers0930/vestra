"use client";

import { useState } from "react";
import { Calculator, Building2, Home, ArrowRightLeft, Info } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
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
import { SliderInput } from "@/components/forms";
import { InfoRow } from "@/components/results";

type TaxTab = "acquisition" | "holding" | "transfer";

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState<TaxTab>("acquisition");

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
    <div className="max-w-6xl mx-auto">
      <PageHeader icon={Calculator} title="세무 시뮬레이션" description="취득세 · 보유세 · 양도세 실시간 계산" />

      {/* Tax Comparison Chart */}
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
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-white shadow-md"
                : "bg-card text-secondary border border-border hover:bg-gray-50"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 취득세 */}
      {activeTab === "acquisition" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-primary" />
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
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">{acqResult.label}</div>
                <div className="text-3xl font-bold text-blue-700">{formatKRW(acqResult.totalTax || acqResult.tax)}</div>
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
              <Home size={20} className="text-success" />
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
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-sm text-emerald-600 mb-1">연간 보유세 합계</div>
                <div className="text-3xl font-bold text-emerald-700">{formatKRW(holdResult.totalTax)}</div>
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
              <ArrowRightLeft size={20} className="text-amber-500" />
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
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-amber-600 mb-1">양도소득세 합계</div>
                <div className="text-3xl font-bold text-amber-700">{formatKRW(transResult.totalTax || transResult.tax || 0)}</div>
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
    </div>
  );
}
