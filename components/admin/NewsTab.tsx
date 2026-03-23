"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Search,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/common";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: string;
  tags: string[];
  policyType: string | null;
  publishedAt: string;
  collectedAt: string;
  isAlert: boolean;
  alertAcked: boolean;
  usageCount: number;
}

interface Stats {
  today: number;
  week: number;
  total: number;
  alertCount: number;
  lastCollected: string | null;
  weeklyUsage: { usedIn: string; count: number }[];
}

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  hankyung: "한국경제",
  mk: "매일경제",
  molit: "국토교통부",
  moef: "기획재정부",
  nts: "국세청",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "전체" },
  { value: "news", label: "뉴스" },
  { value: "policy", label: "정책" },
];

export function NewsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [alerts, setAlerts] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // 검색 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/news/stats");
      if (res.ok) setStats(await res.json());
      else setStats({ today: 0, week: 0, total: 0, alertCount: 0, lastCollected: null, weeklyUsage: [] });
    } catch {
      setStats({ today: 0, week: 0, total: 0, alertCount: 0, lastCollected: null, weeklyUsage: [] });
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (category) params.set("category", category);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const res = await fetch(`/api/admin/news?${params}`);
    if (res.ok) {
      const data = await res.json();
      setArticles(data.items);
      setTotal(data.total);
    }
  }, [page, category, debouncedSearch]);

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/admin/news/alerts");
    if (res.ok) {
      const data = await res.json();
      setAlerts(data.alerts);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchAlerts()]).finally(() => setLoading(false));
  }, [fetchStats, fetchAlerts]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await fetch("/api/admin/news/collect", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      showToast(`수집 완료: ${data.saved}건 저장`);
      await Promise.all([fetchStats(), fetchArticles(), fetchAlerts()]);
    } catch {
      showToast("수집에 실패했습니다.");
    } finally {
      setCollecting(false);
    }
  };

  const handleAckAlert = async (id: string) => {
    try {
      const res = await fetch("/api/admin/news/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      await Promise.all([fetchAlerts(), fetchStats()]);
    } catch {
      showToast("알림 확인에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/news", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      showToast("삭제 완료");
      await Promise.all([fetchArticles(), fetchStats()]);
    } catch {
      showToast("삭제에 실패했습니다.");
    }
  };

  const totalPages = Math.ceil(total / 15);

  const usageLabels: Record<string, string> = {
    chat: "AI 어시스턴트",
    contract: "계약서 분석",
    prediction: "시세전망",
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-400">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "오늘 수집", value: `${stats.today}건` },
            { label: "이번 주", value: `${stats.week}건` },
            { label: "전체", value: `${stats.total}건` },
            { label: "마지막 수집", value: stats.lastCollected ? new Date(stats.lastCollected).toLocaleDateString("ko-KR") : "-" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4 border-0 shadow-none">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-xl font-bold mt-1">{kpi.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* 정책 변경 알림 */}
      {alerts.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-sm">
              정책 변경 알림 ({alerts.length}건 미확인)
            </h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-gray-500">
                    {SOURCE_LABELS[alert.source] || alert.source} ·{" "}
                    {new Date(alert.publishedAt).toLocaleDateString("ko-KR")}
                    {alert.policyType && (
                      <Badge variant="info" className="ml-2 text-xs">
                        {alert.policyType}
                      </Badge>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAckAlert(alert.id)}
                >
                  <CheckCircle size={14} className="mr-1" />
                  확인
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 필터 + 수동 수집 */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="text-sm border rounded-lg px-3 py-2"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="text-sm border rounded-lg pl-9 pr-3 py-2 w-full"
          />
        </div>
        <Button
          size="sm"
          onClick={handleCollect}
          disabled={collecting}
        >
          <RefreshCw size={14} className={`mr-1 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? "수집 중..." : "지금 수집"}
        </Button>
      </div>

      {/* 데이터 목록 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">제목</th>
                <th className="pb-2 font-medium w-20">출처</th>
                <th className="pb-2 font-medium w-16">분류</th>
                <th className="pb-2 font-medium w-24">태그</th>
                <th className="pb-2 font-medium w-24">발행일</th>
                <th className="pb-2 font-medium w-16 text-center">활용</th>
                <th className="pb-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 pr-3">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline line-clamp-1"
                    >
                      {a.title}
                    </a>
                  </td>
                  <td className="py-2.5 text-gray-500">
                    {SOURCE_LABELS[a.source] || a.source}
                  </td>
                  <td className="py-2.5">
                    <Badge variant={a.category === "policy" ? "primary" : "neutral"}>
                      {a.category === "policy" ? "정책" : "뉴스"}
                    </Badge>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {a.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 rounded px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 text-gray-500">
                    {new Date(a.publishedAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="py-2.5 text-center text-gray-500">{a.usageCount}회</td>
                  <td className="py-2.5">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    <Newspaper size={24} className="mx-auto mb-2 opacity-50" />
                    수집된 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 text-sm rounded ${
                  page === p ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 활용 통계 */}
      {stats && stats.weeklyUsage.length > 0 && (
        <Card>
          <h3 className="font-semibold text-sm mb-3">주간 활용 통계</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={stats.weeklyUsage.map((u) => ({
                name: usageLabels[u.usedIn] || u.usedIn,
                count: u.count,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#001466" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm shadow-lg z-50 animate-in fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
