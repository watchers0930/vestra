"use client";

import { cn } from "@/lib/utils";
import { ScrSection, EmptyDataNotice, thCls, tdCls, tdNumCls } from "./scr-shared";
import {
  Building, Users, Briefcase, TrendingUp, BarChart3, Wallet,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type {
  ScrDeveloperAnalysis,
  ScrCompanyOverview,
  ScrShareholderRow,
  ScrOngoingProjectRow,
  ScrProfitabilityRow,
  ScrFinancialStability,
  ScrCashFlowRow,
  YearlyRow,
} from "@/lib/feasibility/scr-types";

interface ScrChapterIIProps {
  data: ScrDeveloperAnalysis;
}


/* ─── 표8: 회사개요 ─── */
function CompanyOverviewTable({ data }: { data: ScrCompanyOverview }) {
  const rows = [
    ["회사명", data.companyName],
    ["대표이사", data.ceoName],
    ["설립일", data.establishedDate],
    ["종업원 수", `${data.employeeCount}명`],
    ["주요사업", data.mainBusiness],
    ["소재지", data.address],
    ...(data.creditRating ? [["신용등급", data.creditRating]] : []),
  ];

  return (
    <ScrSection icon={Building} title="표8. 회사개요">
      <div className="rounded-xl bg-gray-50/80 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i} className="border-b border-gray-100/80 last:border-0">
                <td className="py-2.5 px-4 text-[#6e6e73] w-[140px]">{label}</td>
                <td className="py-2.5 px-4 text-right font-medium text-[#1d1d1f]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표9: 주주현황 ─── */
function ShareholderTable({ rows }: { rows: ScrShareholderRow[] }) {
  return (
    <ScrSection icon={Users} title="표9. 주주현황">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>주주명</th>
              <th className={cn(thCls, "text-right")}>주식수</th>
              <th className={cn(thCls, "text-right")}>지분율</th>
              <th className={cn(thCls, "text-left")}>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.name}</td>
                <td className={tdNumCls}>{r.shareCount.toLocaleString()}</td>
                <td className={tdNumCls}>{r.shareRatio.toFixed(1)}%</td>
                <td className={cn(tdCls, "text-xs text-[#6e6e73]")}>{r.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표10: 진행중 공사현장 ─── */
function OngoingProjectsTable({ rows }: { rows: ScrOngoingProjectRow[] }) {
  return (
    <ScrSection icon={Briefcase} title="표10. 진행중 공사현장">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>현장명</th>
              <th className={cn(thCls, "text-left")}>소재지</th>
              <th className={cn(thCls, "text-right")}>도급액(만원)</th>
              <th className={cn(thCls, "text-right")}>공정률</th>
              <th className={cn(thCls, "text-center")}>준공예정</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>{r.projectName}</td>
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.location}</td>
                <td className={tdNumCls}>{r.totalAmount.toLocaleString()}</td>
                <td className={tdNumCls}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, r.progress)}%` }}
                      />
                    </div>
                    <span>{r.progress}%</span>
                  </div>
                </td>
                <td className={cn(tdCls, "text-center")}>{r.expectedCompletion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표12: 수익성 지표 차트 + 테이블 ─── */
function ProfitabilitySection({ rows }: { rows: ScrProfitabilityRow[] }) {
  const chartData = rows.map((r) => ({
    year: `${r.year}`,
    매출: r.revenue,
    영업이익: r.operatingProfit,
    당기순이익: r.netIncome,
  }));

  return (
    <ScrSection icon={TrendingUp} title="표12. 수익성 지표" sub={`${rows[0]?.year}~${rows[rows.length - 1]?.year}년`}>
      {/* 차트 */}
      <div className="h-64 mb-5 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}억`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => `${Number(value).toLocaleString()} 만원`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="매출" stroke="#3b82f6" fill="#3b82f680" strokeWidth={2} />
            <Area type="monotone" dataKey="영업이익" stroke="#10b981" fill="#10b98180" strokeWidth={2} />
            <Area type="monotone" dataKey="당기순이익" stroke="#f59e0b" fill="#f59e0b80" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>매출</th>
              <th className={cn(thCls, "text-right")}>매출원가</th>
              <th className={cn(thCls, "text-right")}>매출총이익</th>
              <th className={cn(thCls, "text-right")}>판관비</th>
              <th className={cn(thCls, "text-right")}>영업이익</th>
              <th className={cn(thCls, "text-right")}>EBITDA</th>
              <th className={cn(thCls, "text-right")}>당기순이익</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>{r.year}</td>
                <td className={tdNumCls}>{r.revenue.toLocaleString()}</td>
                <td className={tdNumCls}>{r.costOfRevenue.toLocaleString()}</td>
                <td className={tdNumCls}>{r.grossProfit.toLocaleString()}</td>
                <td className={tdNumCls}>{r.sgaExpense.toLocaleString()}</td>
                <td className={tdNumCls}>{r.operatingProfit.toLocaleString()}</td>
                <td className={tdNumCls}>{r.ebitda.toLocaleString()}</td>
                <td className={tdNumCls}>{r.netIncome.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표13~15: 재무안정성 ─── */
function FinancialStabilitySection({ data }: { data: ScrFinancialStability }) {
  return (
    <ScrSection icon={BarChart3} title="표13~15. 재무안정성 / 유동성 / 차입금">
      {/* 재무안정성 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">재무안정성</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>총자산</th>
              <th className={cn(thCls, "text-right")}>총부채</th>
              <th className={cn(thCls, "text-right")}>자기자본</th>
              <th className={cn(thCls, "text-right")}>부채비율</th>
              <th className={cn(thCls, "text-right")}>차입금의존도</th>
            </tr>
          </thead>
          <tbody>
            {data.balanceSheet.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.year}</td>
                <td className={tdNumCls}>{r.totalAssets.toLocaleString()}</td>
                <td className={tdNumCls}>{r.totalLiabilities.toLocaleString()}</td>
                <td className={tdNumCls}>{r.equity.toLocaleString()}</td>
                <td className={tdNumCls}>{r.debtRatio.toFixed(1)}%</td>
                <td className={tdNumCls}>{r.borrowingDependency.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 유동성 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">유동성</p>
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>유동자산</th>
              <th className={cn(thCls, "text-right")}>유동부채</th>
              <th className={cn(thCls, "text-right")}>유동비율</th>
              <th className={cn(thCls, "text-right")}>당좌비율</th>
            </tr>
          </thead>
          <tbody>
            {data.liquidity.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.year}</td>
                <td className={tdNumCls}>{r.currentAssets.toLocaleString()}</td>
                <td className={tdNumCls}>{r.currentLiabilities.toLocaleString()}</td>
                <td className={tdNumCls}>{r.currentRatio.toFixed(1)}%</td>
                <td className={tdNumCls}>{r.quickRatio.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 차입금 현황 */}
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">차입금 현황</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>대주</th>
              <th className={cn(thCls, "text-left")}>유형</th>
              <th className={cn(thCls, "text-right")}>금액(만원)</th>
              <th className={cn(thCls, "text-right")}>이자율</th>
              <th className={cn(thCls, "text-center")}>만기일</th>
            </tr>
          </thead>
          <tbody>
            {data.borrowingDetail.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.lender}</td>
                <td className={cn(tdCls, "text-[#6e6e73]")}>{r.type}</td>
                <td className={tdNumCls}>{r.amount.toLocaleString()}</td>
                <td className={tdNumCls}>{r.interestRate.toFixed(2)}%</td>
                <td className={cn(tdCls, "text-center")}>{r.maturityDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표16: 현금흐름 ─── */
function CashFlowSection({ rows }: { rows: ScrCashFlowRow[] }) {
  const chartData = rows.map((r) => ({
    year: `${r.year}`,
    영업활동: r.operating,
    투자활동: r.investing,
    재무활동: r.financing,
    기말현금: r.endingBalance,
  }));

  return (
    <ScrSection icon={Wallet} title="표16. 현금흐름" sub={`${rows[0]?.year}~${rows[rows.length - 1]?.year}년`}>
      <div className="h-56 mb-5 print:hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6e6e73" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6e6e73" }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}억`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }}
              formatter={(value) => `${Number(value).toLocaleString()} 만원`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="영업활동" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="투자활동" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="재무활동" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>연도</th>
              <th className={cn(thCls, "text-right")}>영업활동</th>
              <th className={cn(thCls, "text-right")}>투자활동</th>
              <th className={cn(thCls, "text-right")}>재무활동</th>
              <th className={cn(thCls, "text-right")}>현금증감</th>
              <th className={cn(thCls, "text-right")}>기말현금</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.year}</td>
                <td className={cn(tdNumCls, r.operating < 0 && "text-red-500")}>{r.operating.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.investing < 0 && "text-red-500")}>{r.investing.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.financing < 0 && "text-red-500")}>{r.financing.toLocaleString()}</td>
                <td className={cn(tdNumCls, r.netChange < 0 && "text-red-500")}>{r.netChange.toLocaleString()}</td>
                <td className={tdNumCls}>{r.endingBalance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 메인 II장 컴포넌트 ─── */
export function ScrChapterII({ data }: ScrChapterIIProps) {
  return (
    <div className="space-y-5">
      <CompanyOverviewTable data={data.companyOverview} />

      {data.shareholders.length > 0 ? (
        <ShareholderTable rows={data.shareholders} />
      ) : (
        <ScrSection icon={Users} title="표9. 주주현황">
          <EmptyDataNotice message="주주현황 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.ongoingProjects.length > 0 ? (
        <OngoingProjectsTable rows={data.ongoingProjects} />
      ) : (
        <ScrSection icon={Briefcase} title="표10. 진행중 공사현장">
          <EmptyDataNotice message="진행중 공사현장 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.profitability.length > 0 ? (
        <ProfitabilitySection rows={data.profitability} />
      ) : (
        <ScrSection icon={TrendingUp} title="표12. 수익성 지표">
          <EmptyDataNotice message="수익성 지표 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.financialStability.balanceSheet.length > 0 ? (
        <FinancialStabilitySection data={data.financialStability} />
      ) : (
        <ScrSection icon={BarChart3} title="표13~15. 재무안정성 / 유동성 / 차입금">
          <EmptyDataNotice message="재무안정성 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.cashFlow.length > 0 ? (
        <CashFlowSection rows={data.cashFlow} />
      ) : (
        <ScrSection icon={Wallet} title="표16. 현금흐름">
          <EmptyDataNotice message="현금흐름 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}
    </div>
  );
}
