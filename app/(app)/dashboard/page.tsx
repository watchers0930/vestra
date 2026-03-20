"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Wallet,
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  Home,
  Search,
  BarChart3,
  Trash2,
  Info,
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { getAssets, getAnalyses, removeAnalysis, type StoredAsset, type AnalysisRecord } from "@/lib/store";
import { EmptyState } from "@/components/common";
import { KpiCard } from "@/components/results";

const typeIcons: Record<string, typeof FileText> = {
  rights: Shield,
  contract: FileText,
  prediction: TrendingUp,
  jeonse: Home,
  feasibility: BarChart3,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  rights: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  contract: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  prediction: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  jeonse: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  feasibility: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
};

export default function DashboardPage() {
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAssets(getAssets());
    setAnalyses(getAnalyses());
    setMounted(true);
  }, []);

  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + a.estimatedPrice, 0);
  const avgSafety = assets.length > 0
    ? Math.round(assets.reduce((sum, a) => sum + a.safetyScore, 0) / assets.length)
    : 0;
  const avgRisk = assets.length > 0
    ? Math.round(assets.reduce((sum, a) => sum + a.riskScore, 0) / assets.length)
    : 0;

  const handleDeleteAnalysis = (id: string) => {
    removeAnalysis(id);
    setAnalyses(getAnalyses());
  };

  const isEmpty = totalAssets === 0 && analyses.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f]">대시보드</h1>
          <p className="mt-0.5 text-sm text-[#86868b]">자산 현황 및 리스크 모니터링</p>
        </div>
      </div>

      {/* Info Banner - MiriCanvas style */}
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-primary/5 border border-primary/10">
        <Info size={16} className="text-primary shrink-0" />
        <p className="text-sm text-[#424245]">
          권리분석, 계약검토, 시세전망 등에서 분석한 결과가 이 대시보드에 자동으로 표시됩니다.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="관리 자산"
          value={`${totalAssets}건`}
          description="분석된 부동산"
          icon={Building2}
        />
        <KpiCard
          label="총 평가액"
          value={mounted ? (totalValue > 0 ? formatKRW(totalValue) : "-") : "-"}
          description="추정 시세 합계"
          icon={Wallet}
        />
        <KpiCard
          label="평균 안전지수"
          value={mounted && totalAssets > 0 ? `${avgSafety}/100` : "-"}
          description="등록 자산 평균"
          icon={ShieldAlert}
        />
        <KpiCard
          label="평균 리스크"
          value={mounted && totalAssets > 0 ? `${avgRisk}/100` : "-"}
          description="낮을수록 안전"
          icon={AlertTriangle}
        />
      </div>

      {/* Empty State */}
      {mounted && isEmpty && (
        <EmptyState
          icon={Search}
          title="아직 분석한 자산이 없습니다"
          description="권리분석, 계약검토, 가치예측, 전세보호 메뉴에서 부동산을 분석하면 이 대시보드에 자동으로 표시됩니다."
          actions={[
            { href: "/rights", label: "권리분석 시작", icon: Shield },
            { href: "/contract", label: "계약검토", icon: FileText, variant: "secondary" },
            { href: "/prediction", label: "가치예측", icon: TrendingUp, variant: "secondary" },
          ]}
        />
      )}

      {/* Assets List */}
      {mounted && assets.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">관리 자산</h2>
              <p className="text-xs text-[#86868b] mt-0.5">분석된 부동산 목록</p>
            </div>
            <span className="text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] px-2.5 py-1 rounded-full">
              {assets.length}건
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-gray-100 p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] truncate max-w-[200px]">
                      {asset.address}
                    </p>
                    <p className="text-xs text-[#86868b] mt-0.5">{asset.type}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7]">
                    <BarChart3 className="h-4 w-4 text-[#1d1d1f]" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#86868b]">추정 시세</span>
                    <span className="font-semibold text-primary">{formatKRW(asset.estimatedPrice)}</span>
                  </div>
                  {asset.jeonsePrice && asset.jeonsePrice > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#86868b]">전세가</span>
                      <span className="font-medium text-[#1d1d1f]">{formatKRW(asset.jeonsePrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-[#86868b]">안전지수</span>
                    <span className={cn(
                      "font-semibold",
                      asset.safetyScore >= 70 ? "text-emerald-600" : asset.safetyScore >= 40 ? "text-amber-600" : "text-red-600"
                    )}>
                      {asset.safetyScore}점
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-gray-100">
                  <p className="text-[10px] text-[#86868b] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(asset.lastAnalyzedDate).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Analysis History */}
      {mounted && analyses.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1d1d1f]">최근 분석 내역</h2>
              <p className="text-xs text-[#86868b] mt-0.5">AI 분석 리포트 히스토리</p>
            </div>
            <span className="text-xs text-[#86868b]">{analyses.length}건</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">유형</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">대상</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">분석 요약</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">날짜</th>
                  <th className="py-3 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(0, 10).map((item) => {
                  const Icon = typeIcons[item.type] || FileText;
                  const colors = typeColors[item.type] || { bg: "bg-gray-50", text: "text-gray-600" };
                  return (
                    <tr key={item.id} className="group border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colors.bg)}>
                            <Icon className={cn("h-4 w-4", colors.text)} strokeWidth={1.5} />
                          </div>
                          <span className="text-sm font-medium text-[#1d1d1f]">{item.typeLabel}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-[#424245] truncate max-w-[150px]">
                          {item.address}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="max-w-md truncate text-sm text-[#86868b]">{item.summary}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs text-[#86868b]">{new Date(item.date).toLocaleDateString("ko-KR")}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteAnalysis(item.id)}
                          className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
