"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import {
  Users, Home, TrendingDown, Building2, BarChart3, MapPin,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type {
  ScrMarketAnalysis,
  ScrRegulations,
  ScrDemographics,
  ScrHousingMarket,
  ScrSupplyItem,
  ScrUnsoldComplex,
} from "@/lib/feasibility/scr-types";

interface ScrChapterIIIProps {
  data: ScrMarketAnalysis;
}


/* ─── 규제 요약 ─── */
function RegulationsView({ data }: { data: ScrRegulations }) {
  const items = [
    { label: "LTV", value: `${data.ltvRatio}%` },
    { label: "DTI", value: `${data.dtiRatio}%` },
    ...(data.dsrRatio != null ? [{ label: "DSR", value: `${data.dsrRatio}%` }] : []),
    { label: "전매제한", value: `${data.resaleRestrictionMonths}개월` },
    ...(data.regulatedAreaType ? [{ label: "규제지역", value: data.regulatedAreaType }] : []),
  ];

  return (
    <ScrSection icon={MapPin} title="부동산 주요 규제">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-gray-50/80 p-3 text-center">
            <p className="text-[11px] text-[#6e6e73] mb-1">{item.label}</p>
            <p className="text-sm font-bold text-[#1d1d1f]">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3">
        <p className="text-xs text-[#6e6e73] mb-1 font-semibold">청약 규제</p>
        <p className="text-sm text-[#1d1d1f]">{data.subscriptionRestriction}</p>
      </div>
      {data.summary && (
        <p className="text-xs text-[#6e6e73] mt-3 leading-relaxed">{data.summary}</p>
      )}
    </ScrSection>
  );
}

/* ─── 표17: 인구/세대 추이 차트 ─── */
function PopulationSection({ data }: { data: ScrDemographics }) {
  const chartData = data.populationHousehold.map((r) => ({
    year: `${r.year}`,
    인구: r.population,
    세대: r.households,
  }));

  return (
    <ScrSection icon={Users} title="표17~19. 인구 / 세대 / 산업" sub="인구수, 세대수, 연령대별, 산업별">
      {/* 인구 추이 차트 */}
      <div className="h-56 mb-5 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => Number(value).toLocaleString()}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="인구" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="세대" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 인구/세대 테이블 */}
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>인구수</th>
              <th className={cn(thCls, "text-right")}>세대수</th>
              <th className={cn(thCls, "text-right")}>세대당 인원</th>
            </tr>
          </thead>
          <tbody>
            {data.populationHousehold.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.year}</td>
                <td className={tdNumCls}>{r.population.toLocaleString()}</td>
                <td className={tdNumCls}>{r.households.toLocaleString()}</td>
                <td className={tdNumCls}>{r.personsPerHousehold.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 연령대별 인구 */}
      {data.ageDistribution.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">연령대별 인구</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-5">
            {data.ageDistribution.map((a) => (
              <div key={a.ageGroup} className="rounded-lg bg-gray-50/80 p-2.5 text-center">
                <p className="text-[11px] text-[#6e6e73]">{a.ageGroup}</p>
                <p className="text-sm font-bold text-[#1d1d1f]">{a.count.toLocaleString()}</p>
                <p className="text-[10px] text-[#86868b]">{a.ratio.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 산업별 종사자 */}
      {data.industryEmployment.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">산업별 종사자</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className={cn(thCls, "text-left")}>산업</th>
                  <th className={cn(thCls, "text-right")}>종사자 수</th>
                  <th className={cn(thCls, "text-right")}>비율</th>
                </tr>
              </thead>
              <tbody>
                {data.industryEmployment.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className={tdCls}>{r.industry}</td>
                    <td className={tdNumCls}>{r.employeeCount.toLocaleString()}</td>
                    <td className={tdNumCls}>{r.ratio.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ScrSection>
  );
}

/* ─── 표20~24: 주택시장 ─── */
function HousingMarketSection({ data }: { data: ScrHousingMarket }) {
  // 주택보급률 차트
  const supplyChartData = data.supplyRate.map((r) => ({
    year: `${r.year}`,
    보급률: r.supplyRate,
    아파트: r.apartment,
    총주택: r.totalHousing,
  }));

  return (
    <ScrSection icon={Home} title="표20~24. 주택시장" sub="보급률, 거래량, 유형별, 건축연령, 면적별">
      {/* 주택보급률 차트 */}
      {data.supplyRate.length > 0 && (
        <div className="h-56 mb-5 print:hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supplyChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6e6e73" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="보급률" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 주택거래량 */}
      {data.transactions.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">주택거래량</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className={cn(thCls, "text-left")}>연월</th>
                  <th className={cn(thCls, "text-right")}>거래량</th>
                  <th className={cn(thCls, "text-right")}>전년비</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className={tdCls}>{r.yearMonth}</td>
                    <td className={tdNumCls}>{r.count.toLocaleString()}</td>
                    <td className={cn(tdNumCls, r.yoyChange != null && r.yoyChange < 0 && "text-red-500")}>
                      {r.yoyChange != null ? `${r.yoyChange > 0 ? "+" : ""}${r.yoyChange.toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 유형별, 건축연령별, 면적별 - 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.housingDistribution.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#6e6e73] mb-2">유형별</p>
            {data.housingDistribution.map((r) => (
              <div key={r.type} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-[#1d1d1f]">{r.type}</span>
                <span className="text-xs font-medium text-[#6e6e73] tabular-nums">{r.ratio.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {data.buildingAge.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#6e6e73] mb-2">건축연령별</p>
            {data.buildingAge.map((r) => (
              <div key={r.ageRange} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-[#1d1d1f]">{r.ageRange}</span>
                <span className="text-xs font-medium text-[#6e6e73] tabular-nums">{r.ratio.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
        {data.supplyByArea.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#6e6e73] mb-2">면적별</p>
            {data.supplyByArea.map((r) => (
              <div key={r.areaRange} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-[#1d1d1f]">{r.areaRange}</span>
                <span className="text-xs font-medium text-[#6e6e73] tabular-nums">{r.ratio.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrSection>
  );
}

/* ─── 표25~27: 입주/분양 예정 ─── */
function SupplySection({ upcoming, planned }: { upcoming: ScrSupplyItem[]; planned: ScrSupplyItem[] }) {
  function SupplyTable({ items, label }: { items: ScrSupplyItem[]; label: string }) {
    if (!items.length) return null;
    return (
      <div className="mb-5 last:mb-0">
        <p className="text-xs font-semibold text-[#6e6e73] mb-2">{label}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/80">
                <th className={cn(thCls, "text-left")}>단지명</th>
                <th className={cn(thCls, "text-left")}>소재지</th>
                <th className={cn(thCls, "text-right")}>세대수</th>
                <th className={cn(thCls, "text-center")}>입주예정</th>
                <th className={cn(thCls, "text-right")}>분양가(만원/평)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className={tdCls}>{r.complexName}</td>
                  <td className={cn(tdCls, "text-[#6e6e73]")}>{r.location}</td>
                  <td className={tdNumCls}>{r.totalUnits.toLocaleString()}</td>
                  <td className={cn(tdCls, "text-center")}>{r.moveInDate}</td>
                  <td className={tdNumCls}>{r.salePrice ? r.salePrice.toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <ScrSection icon={Building2} title="표25~27. 입주/분양 예정">
      <SupplyTable items={upcoming} label="입주예정 단지" />
      <SupplyTable items={planned} label="분양예정 단지" />
    </ScrSection>
  );
}

/* ─── 표28,29: 미분양 ─── */
function UnsoldSection({
  trend,
  complexes,
}: {
  trend: ScrHousingMarket["unsoldTrend"];
  complexes: ScrUnsoldComplex[];
}) {
  const chartData = trend.map((r) => ({
    월: r.yearMonth,
    총미분양: r.totalUnsold,
    준공후미분양: r.afterCompletion,
  }));

  return (
    <ScrSection icon={TrendingDown} title="표28~29. 미분양 추이" sub="총 미분양 및 준공후 미분양">
      {trend.length > 0 && (
        <div className="h-56 mb-5 print:hidden">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="월" tick={{ fontSize: 11, fill: "#6e6e73" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="총미분양" stroke="#ef4444" fill="#ef444440" strokeWidth={2} />
              <Area type="monotone" dataKey="준공후미분양" stroke="#f59e0b" fill="#f59e0b40" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {complexes.length > 0 && (
        <>
          <p className="text-xs font-semibold text-[#6e6e73] mb-2">미분양 단지</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className={cn(thCls, "text-left")}>단지명</th>
                  <th className={cn(thCls, "text-left")}>소재지</th>
                  <th className={cn(thCls, "text-right")}>총세대</th>
                  <th className={cn(thCls, "text-right")}>미분양</th>
                  <th className={cn(thCls, "text-right")}>미분양률</th>
                </tr>
              </thead>
              <tbody>
                {complexes.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className={tdCls}>{r.complexName}</td>
                    <td className={cn(tdCls, "text-[#6e6e73]")}>{r.location}</td>
                    <td className={tdNumCls}>{r.totalUnits.toLocaleString()}</td>
                    <td className={cn(tdNumCls, "text-red-500")}>{r.unsoldUnits.toLocaleString()}</td>
                    <td className={cn(tdNumCls, r.unsoldRatio > 30 && "text-red-500")}>
                      {r.unsoldRatio.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ScrSection>
  );
}

/* ─── 메인 III장 컴포넌트 ─── */
export function ScrChapterIII({ data }: ScrChapterIIIProps) {
  return (
    <div className="space-y-5">
      <RegulationsView data={data.regulations} />
      <PopulationSection data={data.demographics} />
      <HousingMarketSection data={data.housingMarket} />
      <SupplySection
        upcoming={data.housingMarket.upcomingSupply}
        planned={data.housingMarket.plannedSupply}
      />
      <UnsoldSection
        trend={data.housingMarket.unsoldTrend}
        complexes={data.housingMarket.unsoldComplexes}
      />
    </div>
  );
}
