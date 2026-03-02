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
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { getAssets, getAnalyses, removeAnalysis, type StoredAsset, type AnalysisRecord } from "@/lib/store";
import { Card, CardHeader, CardContent, EmptyState } from "@/components/common";
import { KpiCard } from "@/components/results";

const typeIcons: Record<string, typeof FileText> = {
  rights: Shield,
  contract: FileText,
  prediction: TrendingUp,
  jeonse: Home,
};

const typeColors: Record<string, string> = {
  rights: "bg-blue-50 text-blue-600",
  contract: "bg-purple-50 text-purple-600",
  prediction: "bg-emerald-50 text-emerald-600",
  jeonse: "bg-amber-50 text-amber-600",
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-muted">자산 현황 및 리스크 모니터링</p>
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
          iconBg="bg-emerald-50"
          iconColor="text-success"
        />
        <KpiCard
          label="평균 안전지수"
          value={mounted && totalAssets > 0 ? `${avgSafety}/100` : "-"}
          description="등록 자산 평균"
          icon={ShieldAlert}
          iconColor="text-primary-light"
        />
        <KpiCard
          label="평균 리스크"
          value={mounted && totalAssets > 0 ? `${avgRisk}/100` : "-"}
          description="낮을수록 안전"
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-warning"
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
        <Card>
          <CardContent>
            <CardHeader title="관리 자산" description="분석된 부동산 목록">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
                {assets.length}건
              </span>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-border p-4 card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                        {asset.address}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{asset.type}</p>
                    </div>
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      asset.safetyScore >= 70 ? "bg-emerald-50" : asset.safetyScore >= 40 ? "bg-amber-50" : "bg-red-50"
                    )}>
                      <BarChart3 className={cn(
                        "h-4 w-4",
                        asset.safetyScore >= 70 ? "text-emerald-600" : asset.safetyScore >= 40 ? "text-amber-600" : "text-red-600"
                      )} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">추정 시세</span>
                      <span className="font-semibold text-primary">{formatKRW(asset.estimatedPrice)}</span>
                    </div>
                    {asset.jeonsePrice && asset.jeonsePrice > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">전세가</span>
                        <span className="font-medium">{formatKRW(asset.jeonsePrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">안전지수</span>
                      <span className={cn(
                        "font-semibold",
                        asset.safetyScore >= 70 ? "text-emerald-600" : asset.safetyScore >= 40 ? "text-amber-600" : "text-red-600"
                      )}>
                        {asset.safetyScore}점
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(asset.lastAnalyzedDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Analysis History */}
      {mounted && analyses.length > 0 && (
        <Card>
          <CardContent>
            <CardHeader title="최근 분석 내역" description="AI 분석 리포트 히스토리">
              <span className="text-xs text-muted">{analyses.length}건</span>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">유형</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">대상</th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">분석 요약</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">날짜</th>
                    <th className="pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analyses.slice(0, 10).map((item) => {
                    const Icon = typeIcons[item.type] || FileText;
                    const colorClass = typeColors[item.type] || "bg-gray-50 text-gray-600";
                    return (
                      <tr key={item.id} className="group transition-colors hover:bg-background">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colorClass)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{item.typeLabel}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-secondary truncate max-w-[150px] inline-block">
                            {item.address}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <p className="max-w-md truncate text-sm text-secondary">{item.summary}</p>
                        </td>
                        <td className="py-3.5 text-right">
                          <span className="text-xs text-muted">{new Date(item.date).toLocaleDateString("ko-KR")}</span>
                        </td>
                        <td className="py-3.5 text-right">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
