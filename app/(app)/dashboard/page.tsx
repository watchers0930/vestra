"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  PieChart as PieChartIcon,
  Calculator,
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle,
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { getAssets, getAnalyses, removeAnalysis, type StoredAsset, type AnalysisRecord } from "@/lib/store";
import { EmptyState } from "@/components/common";
import { KpiCard } from "@/components/results";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const { data: session } = useSession();
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cascadeLoading, setCascadeLoading] = useState<string | null>(null);
  const [monitoredCount, setMonitoredCount] = useState(0);
  const [monitoredAddresses, setMonitoredAddresses] = useState<Set<string>>(new Set());
  const [monitoringLoading, setMonitoringLoading] = useState<string | null>(null);
  const [monitoringSuccess, setMonitoringSuccess] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      if (session?.user) {
        // 인증 사용자: DB 우선 로딩
        try {
          const res = await fetch("/api/user/sync-data");
          if (res.ok) {
            const data = await res.json();
            setAnalyses(data.analyses || []);
            setAssets(data.assets || []);
          } else {
            // DB 실패 시 localStorage 폴백
            setAssets(getAssets());
            setAnalyses(getAnalyses());
          }
        } catch {
          setAssets(getAssets());
          setAnalyses(getAnalyses());
        }
        // 모니터링 현황 로드
        try {
          const monRes = await fetch("/api/monitoring");
          if (monRes.ok) {
            const monData = await monRes.json();
            setMonitoredCount(monData.total || 0);
            const addrs = new Set<string>(
              (monData.properties || []).map((p: { address: string }) => p.address)
            );
            setMonitoredAddresses(addrs);
          }
        } catch { /* 모니터링 조회 실패 무시 */ }
      } else {
        // 게스트: localStorage 로드
        setAssets(getAssets());
        setAnalyses(getAnalyses());
      }
      setMounted(true);
      setLoading(false);
    }
    loadData();
  }, [session]);

  const totalAssets = assets.length;
  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + a.estimatedPrice, 0), [assets]);
  const avgSafety = useMemo(
    () => assets.length > 0 ? Math.round(assets.reduce((sum, a) => sum + a.safetyScore, 0) / assets.length) : 0,
    [assets],
  );
  const avgRisk = useMemo(
    () => assets.length > 0 ? Math.round(assets.reduce((sum, a) => sum + a.riskScore, 0) / assets.length) : 0,
    [assets],
  );

  // 리스크 분포 계산
  const riskDistribution = useMemo(() => {
    if (assets.length === 0) return [];
    const low = assets.filter((a) => a.riskScore <= 30).length;
    const mid = assets.filter((a) => a.riskScore > 30 && a.riskScore <= 60).length;
    const high = assets.filter((a) => a.riskScore > 60).length;
    return [
      { name: "저위험 (0-30)", value: low, fill: "#34d399" },
      { name: "중위험 (31-60)", value: mid, fill: "#fbbf24" },
      { name: "고위험 (61+)", value: high, fill: "#f87171" },
    ].filter((d) => d.value > 0);
  }, [assets]);

  // 자산별 가치 차트 데이터 (상위 8건)
  const assetValueData = useMemo(
    () => assets.slice(0, 8).map((a) => ({
      name: a.address.length > 12 ? a.address.slice(0, 12) + "..." : a.address,
      value: a.estimatedPrice,
      risk: a.riskScore,
    })),
    [assets],
  );

  const handleDeleteAnalysis = useCallback(async (id: string) => {
    removeAnalysis(id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    if (session?.user) {
      try {
        await fetch("/api/user/sync-data", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId: id }),
        });
      } catch { /* 실패해도 로컬은 이미 삭제됨 */ }
    }
  }, [session?.user]);

  // 동일 주소별 분석 건수 맵
  const addressCountMap = useMemo(
    () => analyses.reduce<Record<string, number>>((acc, a) => { acc[a.address] = (acc[a.address] || 0) + 1; return acc; }, {}),
    [analyses],
  );

  const handleCascadeUpdate = async (address: string) => {
    setCascadeLoading(address);
    try {
      const res = await fetch("/api/cascade-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`캐스케이드 업데이트 완료: ${data.cascade.totalNodesAffected}개 노드 영향, ${data.cascade.executionTimeMs}ms`);
      } else {
        alert(data.error || "캐스케이드 업데이트 실패");
      }
    } catch {
      alert("캐스케이드 업데이트 요청 중 오류가 발생했습니다.");
    } finally {
      setCascadeLoading(null);
    }
  };

  const handleMonitorRegister = async (address: string) => {
    if (!session?.user) return;
    setMonitoringLoading(address);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok || res.status === 409) {
        setMonitoredAddresses((prev) => new Set(prev).add(address));
        setMonitoringSuccess((prev) => new Set(prev).add(address));
        if (res.ok) {
          setMonitoredCount((prev) => prev + 1);
        }
      }
    } catch { /* 실패 무시 */ } finally {
      setMonitoringLoading(null);
    }
  };

  const isEmpty = totalAssets === 0 && analyses.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-[#6e6e73]">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1d1d1f]">대시보드</h1>
          <p className="mt-0.5 text-sm text-[#6e6e73]">자산 현황 및 리스크 모니터링</p>
        </div>
        {session?.user && monitoredCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <Eye size={14} className="text-primary" />
            <span className="text-xs font-medium text-primary">모니터링 {monitoredCount}건</span>
          </div>
        )}
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

      {/* 포트폴리오 개요 */}
      {mounted && assets.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7]">
                <PieChartIcon className="h-4 w-4 text-[#1d1d1f]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#1d1d1f]">포트폴리오 개요</h2>
                <p className="text-xs text-[#6e6e73] mt-0.5">자산 구성 및 리스크 분포</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6e6e73]">총 추정가치</p>
              <p className="text-lg font-bold text-[#1d1d1f]">{formatKRW(totalValue)}</p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 리스크 분포 파이 차트 */}
            <div>
              <h3 className="text-sm font-medium text-[#1d1d1f] mb-3">리스크 분포</h3>
              <div className="h-[200px] sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}건`}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}건`, "자산 수"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {riskDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-xs text-[#6e6e73]">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 자산별 추정가치 바 차트 */}
            <div>
              <h3 className="text-sm font-medium text-[#1d1d1f] mb-3">자산별 추정가치</h3>
              {assetValueData.length > 0 ? (
                <div className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetValueData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `${(v / 100000000).toFixed(0)}억`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [formatKRW(Number(value)), "추정가"]}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {assetValueData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={
                              entry.risk <= 30
                                ? "#34d399"
                                : entry.risk <= 60
                                ? "#fbbf24"
                                : "#f87171"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-[#6e6e73]">자산 데이터가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 요약 통계 */}
          <div className="px-5 py-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-[#6e6e73]">총 자산</p>
              <p className="text-sm font-bold text-[#1d1d1f]">{totalAssets}건</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6e6e73]">평균 리스크</p>
              <p className={cn(
                "text-sm font-bold",
                avgRisk <= 30 ? "text-emerald-600" : avgRisk <= 60 ? "text-amber-600" : "text-red-600"
              )}>
                {avgRisk}점
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6e6e73]">평균 안전지수</p>
              <p className={cn(
                "text-sm font-bold",
                avgSafety >= 70 ? "text-emerald-600" : avgSafety >= 40 ? "text-amber-600" : "text-red-600"
              )}>
                {avgSafety}점
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6e6e73]">평균 자산가치</p>
              <p className="text-sm font-bold text-[#1d1d1f]">
                {totalAssets > 0 ? formatKRW(Math.round(totalValue / totalAssets)) : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs text-[#6e6e73] mt-0.5">분석된 부동산 목록</p>
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
                    <p className="text-xs text-[#6e6e73] mt-0.5">{asset.type}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7]">
                    <BarChart3 className="h-4 w-4 text-[#1d1d1f]" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6e6e73]">추정 시세</span>
                    <span className="font-semibold text-primary">{formatKRW(asset.estimatedPrice)}</span>
                  </div>
                  {asset.jeonsePrice && asset.jeonsePrice > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6e6e73]">전세가</span>
                      <span className="font-medium text-[#1d1d1f]">{formatKRW(asset.jeonsePrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6e6e73]">안전지수</span>
                    <span className={cn(
                      "font-semibold",
                      asset.safetyScore >= 70 ? "text-emerald-600" : asset.safetyScore >= 40 ? "text-amber-600" : "text-red-600"
                    )}>
                      {asset.safetyScore}점
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[10px] text-[#6e6e73] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(asset.lastAnalyzedDate).toLocaleDateString("ko-KR")}
                  </p>
                  <div className="flex items-center gap-1">
                    <Link
                      href="/rights"
                      onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                      className="group/btn p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all relative"
                      title="권리분석"
                    >
                      <Shield size={16} strokeWidth={1.5} />
                    </Link>
                    <Link
                      href="/prediction"
                      onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                      className="group/btn p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all relative"
                      title="시세전망"
                    >
                      <TrendingUp size={16} strokeWidth={1.5} />
                    </Link>
                    <Link
                      href="/tax"
                      onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                      className="group/btn p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all relative"
                      title="세무"
                    >
                      <Calculator size={16} strokeWidth={1.5} />
                    </Link>
                    {session?.user && (
                      <button
                        onClick={() => handleMonitorRegister(asset.address)}
                        disabled={monitoringLoading === asset.address || monitoredAddresses.has(asset.address)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all relative",
                          monitoredAddresses.has(asset.address)
                            ? "text-emerald-500 bg-emerald-50 cursor-default"
                            : "text-[#6e6e73] hover:text-primary hover:bg-primary/5"
                        )}
                        title={monitoredAddresses.has(asset.address) ? "이미 등록됨" : "모니터링"}
                      >
                        {monitoringLoading === asset.address ? (
                          <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                        ) : monitoredAddresses.has(asset.address) ? (
                          <CheckCircle size={16} strokeWidth={1.5} />
                        ) : (
                          <Eye size={16} strokeWidth={1.5} />
                        )}
                      </button>
                    )}
                  </div>
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
              <p className="text-xs text-[#6e6e73] mt-0.5">AI 분석 리포트 히스토리</p>
            </div>
            <span className="text-xs text-[#6e6e73]">{analyses.length}건</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">유형</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">대상</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">분석 요약</th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">날짜</th>
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
                        <p className="max-w-md truncate text-sm text-[#6e6e73]">{item.summary}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs text-[#6e6e73]">{new Date(item.date).toLocaleDateString("ko-KR")}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {addressCountMap[item.address] >= 2 && (
                            <button
                              onClick={() => handleCascadeUpdate(item.address)}
                              disabled={cascadeLoading === item.address}
                              className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                              title="연관 분석 업데이트"
                            >
                              <RefreshCw
                                size={14}
                                className={cascadeLoading === item.address ? "animate-spin" : ""}
                              />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAnalysis(item.id)}
                            className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
