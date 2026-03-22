"use client";

import { cn } from "@/lib/utils";
import {
  MapPin, TrendingUp, Home, Scale, MessageSquare,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type {
  ScrPriceAdequacy,
  ScrLocationAnalysis,
  ScrNearbyDevelopmentRow,
  ScrPriceReview,
  ScrAdequacyOpinion,
  ScrSalesCase,
  ScrSupplyCase,
  ScrPremiumRow,
} from "@/lib/feasibility/scr-types";

interface ScrChapterIVProps {
  data: ScrPriceAdequacy;
}

const thCls = "py-3 px-4 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider";
const tdCls = "py-3 px-4 text-sm text-[#1d1d1f]";
const tdNumCls = "py-3 px-4 text-sm text-[#1d1d1f] text-right tabular-nums font-medium";

function Section({
  icon: Icon,
  title,
  sub,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
          <Icon size={16} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#1d1d1f]">{title}</h4>
          {sub && <p className="text-xs text-[#86868b]">{sub}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── 표30: 입지여건 ─── */
function LocationSection({ data }: { data: ScrLocationAnalysis }) {
  const categories = [
    { label: "교통", items: data.transportation },
    { label: "생활 인프라", items: data.livingInfra },
    { label: "교육", items: data.education },
  ];

  return (
    <Section icon={MapPin} title="표30. 입지여건">
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.label}>
            <p className="text-xs font-semibold text-[#6e6e73] mb-2">{cat.label}</p>
            <div className="rounded-xl bg-gray-50/80 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {cat.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100/80 last:border-0">
                      <td className="py-2 px-4 text-[#1d1d1f]">{item.item}</td>
                      <td className="py-2 px-4 text-right text-[#6e6e73]">{item.distance}</td>
                      {item.note && <td className="py-2 px-4 text-xs text-[#86868b]">{item.note}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {data.summary && (
          <p className="text-xs text-[#6e6e73] leading-relaxed mt-2">{data.summary}</p>
        )}
      </div>
    </Section>
  );
}

/* ─── 표31: 인근 개발 계획 ─── */
function NearbyDevelopmentTable({ rows }: { rows: ScrNearbyDevelopmentRow[] }) {
  const impactColor: Record<string, string> = {
    "긍정": "bg-emerald-100 text-emerald-700",
    "중립": "bg-gray-100 text-gray-600",
    "부정": "bg-red-100 text-red-700",
  };

  return (
    <Section icon={Home} title="표31. 인근 개발 계획">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>개발계획</th>
              <th className={cn(thCls, "text-left")}>내용</th>
              <th className={cn(thCls, "text-center")}>완료예정</th>
              <th className={cn(thCls, "text-center")}>영향</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.planName}</td>
                <td className={cn(tdCls, "text-[#6e6e73] max-w-[240px]")}>{r.description}</td>
                <td className={cn(tdCls, "text-center")}>{r.expectedCompletion || "-"}</td>
                <td className={cn(tdCls, "text-center")}>
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold", impactColor[r.impact])}>
                    {r.impact}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ─── 표32: 시세추이 7년 차트 ─── */
function RegionalTrendChart({ data }: { data: ScrPriceReview["regionalTrend"] }) {
  if (!data.length) return null;

  const chartData = data.map((r) => ({
    year: `${r.year}`,
    시세: r.avgMarketPrice,
    분양가: r.avgSalePrice,
    프리미엄률: r.premiumRate,
  }));

  return (
    <Section icon={TrendingUp} title="표32. 지역 평균 시세 및 분양가 추이" sub="최근 7년">
      <div className="h-64 mb-5 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${v.toLocaleString()}`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value, name) =>
                name === "프리미엄률" ? `${Number(value).toFixed(1)}%` : `${Number(value).toLocaleString()} 만원/평`
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="시세" stroke="#3b82f6" fill="#3b82f640" strokeWidth={2} />
            <Area type="monotone" dataKey="분양가" stroke="#10b981" fill="#10b98140" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>평균 시세(만원/평)</th>
              <th className={cn(thCls, "text-right")}>평균 분양가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>프리미엄률</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.year}</td>
                <td className={tdNumCls}>{r.avgMarketPrice.toLocaleString()}</td>
                <td className={tdNumCls}>{r.avgSalePrice.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.premiumRate > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumRate > 0 ? "+" : ""}{r.premiumRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ─── 표33,34: 매매사례 ─── */
function SalesCasesTable({ cases }: { cases: ScrSalesCase[] }) {
  if (!cases.length) return null;

  return (
    <Section icon={Home} title="표33~34. 인근 매매사례">
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단지명</th>
              <th className={cn(thCls, "text-right")}>전용(m²)</th>
              <th className={cn(thCls, "text-right")}>거래가(만원)</th>
              <th className={cn(thCls, "text-right")}>전용 평당가</th>
              <th className={cn(thCls, "text-center")}>거래일</th>
              <th className={cn(thCls, "text-right")}>층</th>
              <th className={cn(thCls, "text-right")}>건축년</th>
              <th className={cn(thCls, "text-right")}>거리(km)</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>
                  <div>
                    <p className="font-medium">{r.complexName}</p>
                    <p className="text-[10px] text-[#86868b]">{r.address}</p>
                  </div>
                </td>
                <td className={tdNumCls}>{r.exclusiveArea.toFixed(2)}</td>
                <td className={tdNumCls}>{r.transactionPrice.toLocaleString()}</td>
                <td className={tdNumCls}>{r.pricePerExclusivePyeong.toLocaleString()}</td>
                <td className={cn(tdCls, "text-center")}>{r.transactionDate}</td>
                <td className={tdNumCls}>{r.floor}</td>
                <td className={tdNumCls}>{r.buildYear}</td>
                <td className={tdNumCls}>{r.distanceKm.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ─── 표35,36: 분양사례 ─── */
function SupplyCasesTable({ cases }: { cases: ScrSupplyCase[] }) {
  if (!cases.length) return null;

  return (
    <Section icon={Home} title="표35~36. 인근 분양사례">
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단지명</th>
              <th className={cn(thCls, "text-left")}>시공사</th>
              <th className={cn(thCls, "text-right")}>세대수</th>
              <th className={cn(thCls, "text-right")}>전용(m²)</th>
              <th className={cn(thCls, "text-right")}>분양가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>현재시세</th>
              <th className={cn(thCls, "text-right")}>프리미엄</th>
              <th className={cn(thCls, "text-right")}>분양률</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>
                  <div>
                    <p className="font-medium">{r.complexName}</p>
                    <p className="text-[10px] text-[#86868b]">{r.address}</p>
                  </div>
                </td>
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.constructor}</td>
                <td className={tdNumCls}>{r.totalUnits.toLocaleString()}</td>
                <td className={tdNumCls}>{r.exclusiveArea.toFixed(2)}</td>
                <td className={tdNumCls}>{r.salePricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.currentMarketPrice ? r.currentMarketPrice.toLocaleString() : "-"}</td>
                <td className={cn(tdNumCls, (r.premiumRate ?? 0) > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumRate != null ? `${r.premiumRate > 0 ? "+" : ""}${r.premiumRate.toFixed(1)}%` : "-"}
                </td>
                <td className={tdNumCls}>{r.saleRate != null ? `${r.saleRate.toFixed(1)}%` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ─── 표37: 프리미엄 분석 ─── */
function PremiumTable({ rows }: { rows: ScrPremiumRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">표37. 분양사례 프리미엄</p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단지명</th>
              <th className={cn(thCls, "text-right")}>분양가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>현재가(만원/평)</th>
              <th className={cn(thCls, "text-right")}>프리미엄(만원/평)</th>
              <th className={cn(thCls, "text-right")}>프리미엄률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.complexName}</td>
                <td className={tdNumCls}>{r.salePricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.currentPricePerPyeong.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.premiumAmount > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumAmount > 0 ? "+" : ""}{r.premiumAmount.toLocaleString()}
                </td>
                <td className={cn(tdNumCls, r.premiumRate > 0 ? "text-emerald-600" : "text-red-500")}>
                  {r.premiumRate > 0 ? "+" : ""}{r.premiumRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 표38,39: 적정성 의견 ─── */
function AdequacyOpinionSection({ data }: { data: ScrAdequacyOpinion }) {
  return (
    <Section icon={Scale} title="표38~39. 분양가 적정성 의견">
      {/* 계획 분양가 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">본건 계획 분양가</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>타입</th>
              <th className={cn(thCls, "text-right")}>평당가(만원)</th>
              <th className={cn(thCls, "text-right")}>총분양가(만원)</th>
            </tr>
          </thead>
          <tbody>
            {data.plannedPrice.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.type}</td>
                <td className={tdNumCls}>{r.pricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.totalPrice.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 비교대상 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">주요 비교대상</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>비교대상</th>
              <th className={cn(thCls, "text-right")}>평당가(만원)</th>
              <th className={cn(thCls, "text-right")}>차이(만원/평)</th>
              <th className={cn(thCls, "text-right")}>차이율</th>
            </tr>
          </thead>
          <tbody>
            {data.comparison.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.target}</td>
                <td className={tdNumCls}>{r.pricePerPyeong.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.gap > 0 ? "text-red-500" : "text-emerald-600")}>
                  {r.gap > 0 ? "+" : ""}{r.gap.toLocaleString()}
                </td>
                <td className={cn(tdNumCls, r.gapRate > 0 ? "text-red-500" : "text-emerald-600")}>
                  {r.gapRate > 0 ? "+" : ""}{r.gapRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 종합 의견 */}
      <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare size={13} className="text-blue-500" />
          <span className="text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider">적정성 종합 의견</span>
        </div>
        <p className="text-sm text-[#424245] leading-relaxed">{data.conclusion}</p>
      </div>
    </Section>
  );
}

/* ─── 메인 IV장 컴포넌트 ─── */
export function ScrChapterIV({ data }: ScrChapterIVProps) {
  return (
    <div className="space-y-5">
      <LocationSection data={data.location} />
      <NearbyDevelopmentTable rows={data.nearbyDevelopment} />

      {data.facilityOverview && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-[#1d1d1f]">시설개요 및 특성</h4>
          </div>
          <div className="p-5">
            <p className="text-sm text-[#424245] leading-relaxed">{data.facilityOverview}</p>
          </div>
        </div>
      )}

      <RegionalTrendChart data={data.priceReview.regionalTrend} />
      <SalesCasesTable cases={data.priceReview.salesCases} />
      <SupplyCasesTable cases={data.priceReview.supplyCases} />

      <Section icon={TrendingUp} title="표37. 프리미엄 분석">
        <PremiumTable rows={data.priceReview.premiumAnalysis} />
      </Section>

      <AdequacyOpinionSection data={data.adequacyOpinion} />
    </div>
  );
}
