"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
import {
  ScrollText, Shield, MapPin, Home, Building2, TrendingUp, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ScrAppendices as ScrAppendicesData } from "@/lib/feasibility/scr-types";

interface ScrAppendicesProps {
  data: ScrAppendicesData;
}


/* ─── 표53,54: 정책 히스토리 ─── */
function PolicyHistoryTable({ data }: { data: ScrAppendicesData["policyHistory"] }) {
  if (!data.length) return null;

  return (
    <ScrSection icon={ScrollText} title="표53~54. 정책 히스토리">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left w-[120px]")}>일자</th>
              <th className={cn(thCls, "text-left")}>정책명</th>
              <th className={cn(thCls, "text-left")}>내용</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.date}</td>
                <td className={cn(tdCls, "font-medium")}>{r.policy}</td>
                <td className={cn(tdCls, "text-[#6e6e73] max-w-[320px]")}>{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표55: 대출 규제 ─── */
function LoanRegulationsTable({ data }: { data: ScrAppendicesData["loanRegulations"] }) {
  if (!data.length) return null;

  return (
    <ScrSection icon={Shield} title="표55. 대출 규제">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>구분</th>
              <th className={cn(thCls, "text-left")}>조건</th>
              <th className={cn(thCls, "text-right")}>LTV</th>
              <th className={cn(thCls, "text-right")}>DTI</th>
              <th className={cn(thCls, "text-left")}>비고</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.category}</td>
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.condition}</td>
                <td className={tdNumCls}>{r.ltv}%</td>
                <td className={tdNumCls}>{r.dti}%</td>
                <td className={cn(tdCls, "text-xs text-[#86868b]")}>{r.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표56~58: 규제지역 ─── */
function RegulatedAreasSection({ data }: { data: ScrAppendicesData["regulatedAreas"] }) {
  if (!data.length) return null;

  return (
    <ScrSection icon={MapPin} title="표56~58. 규제지역">
      <div className="space-y-4">
        {data.map((area, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold",
                area.areaType.includes("투기") ? "bg-red-100 text-red-700" :
                area.areaType.includes("조정") ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-600"
              )}>
                {area.areaType}
              </span>
              <span className="text-xs text-[#86868b]">지정일: {area.designationDate}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {area.regions.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-gray-100 text-[#1d1d1f] text-[11px] font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrSection>
  );
}

/* ─── 표59: HUG 보증 지역 ─── */
function HugAreasTable({ data }: { data: ScrAppendicesData["hugAreas"] }) {
  if (!data.length) return null;

  return (
    <ScrSection icon={Home} title="표59. HUG 보증 지역">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>지역</th>
              <th className={cn(thCls, "text-left")}>보증유형</th>
              <th className={cn(thCls, "text-left")}>조건</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.region}</td>
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.guaranteeType}</td>
                <td className={cn(tdCls, "text-xs text-[#86868b]")}>{r.condition || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표60~64: 인근 개발 상세 ─── */
function NearbyDevelopmentDetailTable({ data }: { data: ScrAppendicesData["nearbyDevelopmentDetail"] }) {
  if (!data.length) return null;

  return (
    <ScrSection icon={Building2} title="표60~64. 인근 개발 상세">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>계획명</th>
              <th className={cn(thCls, "text-left")}>내용</th>
              <th className={cn(thCls, "text-right")}>면적(m²)</th>
              <th className={cn(thCls, "text-left")}>기간</th>
              <th className={cn(thCls, "text-center")}>진행상태</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={cn(tdCls, "font-medium")}>{r.planName}</td>
                <td className={cn(tdCls, "text-[#6e6e73] max-w-[240px]")}>{r.description}</td>
                <td className={tdNumCls}>{r.area ? r.area.toLocaleString() : "-"}</td>
                <td className={cn(tdCls, "text-xs text-[#86868b]")}>{r.period || "-"}</td>
                <td className={cn(tdCls, "text-center")}>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 금리 추이 ─── */
function InterestRateTrendSection({ data }: { data: ScrAppendicesData["interestRateTrend"] }) {
  if (!data.length) return null;

  const chartData = data.map((r) => ({
    월: r.yearMonth,
    기준금리: r.baseRate,
    주담대금리: r.mortgageRate,
  }));

  return (
    <ScrSection icon={TrendingUp} title="금리 추이">
      <div className="h-56 mb-4 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="월" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => `${Number(value).toFixed(2)}%`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="기준금리" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="주담대금리" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ScrSection>
  );
}

/* ─── 부동산 가격지수 추이 ─── */
function PriceIndexTrendSection({ data }: { data: ScrAppendicesData["priceIndexTrend"] }) {
  if (!data.length) return null;

  const chartData = data.map((r) => ({
    월: r.yearMonth,
    아파트지수: r.apartmentIndex,
    전세지수: r.jeonseIndex,
  }));

  return (
    <ScrSection icon={BarChart3} title="부동산 가격지수 추이">
      <div className="h-56 mb-4 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="월" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="아파트지수" stroke="#3b82f6" fill="#3b82f640" strokeWidth={2} />
            <Area type="monotone" dataKey="전세지수" stroke="#10b981" fill="#10b98140" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ScrSection>
  );
}

/* ─── 메인 부록 컴포넌트 ─── */
export function ScrAppendices({ data }: ScrAppendicesProps) {
  return (
    <div className="space-y-5">
      <PolicyHistoryTable data={data.policyHistory} />
      <LoanRegulationsTable data={data.loanRegulations} />
      <RegulatedAreasSection data={data.regulatedAreas} />
      <HugAreasTable data={data.hugAreas} />
      <NearbyDevelopmentDetailTable data={data.nearbyDevelopmentDetail} />
      <InterestRateTrendSection data={data.interestRateTrend} />
      <PriceIndexTrendSection data={data.priceIndexTrend} />
    </div>
  );
}
