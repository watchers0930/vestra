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

type TaxTab = "acquisition" | "holding" | "transfer";

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState<TaxTab>("acquisition");

  // 취득세 state
  const [acqPrice, setAcqPrice] = useState(850000000);
  const [acqHouseCount, setAcqHouseCount] = useState(1);
  const [acqIsAdjusted, setAcqIsAdjusted] = useState(false);
  const [acqIsFirst, setAcqIsFirst] = useState(false);

  // 보유세 state
  const [holdAssessed, setHoldAssessed] = useState(600000000);
  const [holdHouseCount, setHoldHouseCount] = useState(1);
  const [holdIsAdjusted, setHoldIsAdjusted] = useState(false);

  // 양도세 state
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-primary" size={28} />
          세무 시뮬레이션
        </h1>
        <p className="text-secondary mt-1">취득세 · 보유세 · 양도세 실시간 계산</p>
      </div>

      {/* Tax Comparison Chart */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h3 className="font-semibold mb-4">세금 비교</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip
                formatter={(value) => [formatKRW(Number(value)), "세액"]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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

      {/* Content */}
      {activeTab === "acquisition" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-primary" />
              취득세 계산
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">매매가격</label>
                <input
                  type="range"
                  min={50000000}
                  max={5000000000}
                  step={10000000}
                  value={acqPrice}
                  onChange={(e) => setAcqPrice(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="text-right text-sm font-semibold text-primary mt-1">
                  {formatKRW(acqPrice)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">보유 주택수 (매수 후)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAcqHouseCount(n)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                        acqHouseCount === n
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-secondary border-border hover:bg-gray-50"
                      )}
                    >
                      {n >= 4 ? "4+" : n}주택
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acqIsAdjusted}
                    onChange={(e) => setAcqIsAdjusted(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">조정대상지역</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acqIsFirst}
                    onChange={(e) => setAcqIsFirst(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">생애최초 주택</span>
                </label>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">계산 결과</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">{acqResult.label}</div>
                <div className="text-3xl font-bold text-blue-700">
                  {formatKRW(acqResult.totalTax || acqResult.tax)}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">취득세</span>
                  <span className="font-medium">{formatKRW(acqResult.tax)}</span>
                </div>
                {acqResult.localEduTax !== undefined && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-secondary">지방교육세</span>
                    <span className="font-medium">{formatKRW(acqResult.localEduTax)}</span>
                  </div>
                )}
                {acqResult.specialTax !== undefined && acqResult.specialTax > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-secondary">농어촌특별세</span>
                    <span className="font-medium">{formatKRW(acqResult.specialTax)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-secondary">실효세율</span>
                  <span className="font-medium">
                    {((acqResult.totalTax || acqResult.tax) / acqPrice * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-secondary flex items-start gap-2">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>{acqResult.details}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "holding" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Home size={20} className="text-success" />
              보유세 계산
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">공시가격</label>
                <input
                  type="range"
                  min={50000000}
                  max={5000000000}
                  step={10000000}
                  value={holdAssessed}
                  onChange={(e) => setHoldAssessed(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="text-right text-sm font-semibold text-emerald-600 mt-1">
                  {formatKRW(holdAssessed)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">보유 주택수</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setHoldHouseCount(n)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                        holdHouseCount === n
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-secondary border-border hover:bg-gray-50"
                      )}
                    >
                      {n >= 4 ? "4+" : n}주택
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={holdIsAdjusted}
                  onChange={(e) => setHoldIsAdjusted(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-sm">조정대상지역</span>
              </label>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">계산 결과 (연간)</h3>
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-sm text-emerald-600 mb-1">연간 보유세 합계</div>
                <div className="text-3xl font-bold text-emerald-700">
                  {formatKRW(holdResult.totalTax)}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">재산세</span>
                  <span className="font-medium">{formatKRW(holdResult.propertyTax)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">종합부동산세</span>
                  <span className="font-medium">{formatKRW(holdResult.comprehensiveTax)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">공제금액</span>
                  <span className="font-medium">{formatKRW(holdResult.details.deduction)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-secondary">과세표준</span>
                  <span className="font-medium">{formatKRW(holdResult.details.taxableValue)}</span>
                </div>
              </div>
              {holdResult.comprehensiveTax === 0 && (
                <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 flex items-start gap-2">
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  <span>공시가격이 공제금액 이하로 종합부동산세가 부과되지 않습니다.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "transfer" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} className="text-amber-500" />
              양도세 계산
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">취득가격</label>
                <input
                  type="range"
                  min={50000000}
                  max={5000000000}
                  step={10000000}
                  value={transAcqPrice}
                  onChange={(e) => setTransAcqPrice(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="text-right text-sm font-semibold text-amber-600 mt-1">
                  {formatKRW(transAcqPrice)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">양도가격</label>
                <input
                  type="range"
                  min={50000000}
                  max={5000000000}
                  step={10000000}
                  value={transTransPrice}
                  onChange={(e) => setTransTransPrice(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="text-right text-sm font-semibold text-amber-600 mt-1">
                  {formatKRW(transTransPrice)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">보유기간 (년)</label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={transHoldYears}
                    onChange={(e) => setTransHoldYears(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="text-right text-sm font-semibold mt-1">{transHoldYears}년</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">거주기간 (년)</label>
                  <input
                    type="range"
                    min={0}
                    max={transHoldYears}
                    value={Math.min(transLiveYears, transHoldYears)}
                    onChange={(e) => setTransLiveYears(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="text-right text-sm font-semibold mt-1">
                    {Math.min(transLiveYears, transHoldYears)}년
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">보유 주택수</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTransHouseCount(n)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                        transHouseCount === n
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-secondary border-border hover:bg-gray-50"
                      )}
                    >
                      {n >= 3 ? "3+" : n}주택
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transIsAdjusted}
                  onChange={(e) => setTransIsAdjusted(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm">조정대상지역</span>
              </label>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">계산 결과</h3>
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-amber-600 mb-1">양도소득세 합계</div>
                <div className="text-3xl font-bold text-amber-700">
                  {formatKRW(transResult.totalTax || transResult.tax || 0)}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">양도차익</span>
                  <span className="font-medium">{formatKRW(transResult.gain || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">과세표준</span>
                  <span className="font-medium">{formatKRW(transResult.taxableGain || 0)}</span>
                </div>
                {transResult.deductionRate !== undefined && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-secondary">장기보유특별공제</span>
                    <span className="font-medium">
                      {(transResult.deductionRate * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-secondary">양도소득세</span>
                  <span className="font-medium">{formatKRW(transResult.tax || 0)}</span>
                </div>
                {transResult.localIncomeTax !== undefined && (
                  <div className="flex justify-between py-2">
                    <span className="text-secondary">지방소득세</span>
                    <span className="font-medium">{formatKRW(transResult.localIncomeTax)}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-secondary flex items-start gap-2">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>{transResult.details}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
