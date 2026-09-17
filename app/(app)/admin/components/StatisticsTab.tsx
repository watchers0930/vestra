"use client";

import {
  Users, UserPlus, MousePointerClick, Eye, Clock, TrendingUp, Activity,
  FileText, Share2, Globe, Smartphone, Chrome, MonitorSmartphone, MapPin,
  RefreshCw, Radio, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/common";
import { KpiCard } from "@/components/results";
import { useStatistics } from "../hooks/useStatistics";
import { StatBarList } from "./statistics/StatBarList";
import { StatTrendChart } from "./statistics/StatTrendChart";
import type { Ga4Period } from "@/lib/ga4-reports";

const PERIODS: { value: Ga4Period; label: string }[] = [
  { value: 7, label: "7일" },
  { value: 28, label: "28일" },
  { value: 90, label: "90일" },
];

const fmtDuration = (sec: number) => {
  if (!sec) return "0초";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
};
const fmtPct = (r: number) => `${(r * 100).toFixed(1)}%`;
const cleanPath = (p: string) => (p.length > 40 ? p.slice(0, 40) + "…" : p) || "/";

export function StatisticsTab() {
  const { period, setPeriod, data, loading, error, reload } = useStatistics();

  return (
    <div className="space-y-6">
      {/* 상단: 기간 선택 + 실시간 + 새로고침 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#e5e5e7] bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                period === p.value ? "bg-[#2e4bd8] text-white font-semibold" : "text-[#6e6e73] hover:bg-[#f5f5f7]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e7] bg-white px-3 py-1.5">
              <Radio size={15} className="text-[#30a46c]" strokeWidth={2} />
              <span className="text-xs text-[#6e6e73]">실시간</span>
              <span className="text-sm font-bold text-[#1d1d1f] tabular-nums">{data.realtimeActiveUsers}</span>
              <span className="text-xs text-[#6e6e73]">명</span>
            </div>
          )}
          <button
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e5e7] bg-white px-3 py-1.5 text-sm text-[#4b4b4f] hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} strokeWidth={1.8} />
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <Card className="p-6">
          <div className="flex items-start gap-3 text-[#b42318]">
            <AlertCircle size={18} strokeWidth={1.8} className="mt-0.5" />
            <div>
              <p className="text-sm font-semibold">통계를 불러오지 못했습니다</p>
              <p className="mt-1 text-xs text-[#6e6e73]">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-xl bg-[#f5f5f7]" />
            ))}
          </div>
          <div className="h-[280px] animate-pulse rounded-xl bg-[#f5f5f7]" />
        </div>
      )}

      {data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="활성 사용자" value={`${data.summary.activeUsers.toLocaleString()}명`} description={`최근 ${period}일`} icon={Users} />
            <KpiCard label="신규 사용자" value={`${data.summary.newUsers.toLocaleString()}명`} description="첫 방문자" icon={UserPlus} />
            <KpiCard label="세션" value={`${data.summary.sessions.toLocaleString()}회`} description="방문 세션 수" icon={MousePointerClick} />
            <KpiCard label="페이지뷰" value={`${data.summary.screenPageViews.toLocaleString()}회`} description="총 조회수" icon={Eye} />
            <KpiCard label="평균 참여시간" value={fmtDuration(data.summary.averageSessionDuration)} description="세션당 평균" icon={Clock} />
            <KpiCard label="참여율" value={fmtPct(data.summary.engagementRate)} description="참여 세션 비율" icon={TrendingUp} />
            <KpiCard label="이탈률" value={fmtPct(data.summary.bounceRate)} description="이탈 세션 비율" icon={Activity} />
            <KpiCard label="이벤트" value={`${data.summary.eventCount.toLocaleString()}회`} description="총 이벤트 수" icon={Activity} />
          </div>

          {/* 추이 */}
          <StatTrendChart daily={data.daily} />

          {/* 섹션들 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatBarList title="인기 페이지" icon={FileText} items={data.topPages} unit="회" formatName={cleanPath} />
            <StatBarList title="유입 채널" icon={Share2} items={data.channels} unit="세션" />
            <StatBarList title="소스 / 매체" icon={Globe} items={data.sourceMedium} unit="세션" />
            <StatBarList title="이벤트" icon={Activity} items={data.events} unit="회" />
            <StatBarList title="기기" icon={Smartphone} items={data.devices} unit="명" />
            <StatBarList title="브라우저" icon={Chrome} items={data.browsers} unit="명" />
            <StatBarList title="운영체제" icon={MonitorSmartphone} items={data.os} unit="명" />
            <StatBarList title="국가" icon={Globe} items={data.countries} unit="명" />
            <StatBarList title="도시" icon={MapPin} items={data.cities} unit="명" />
            <StatBarList title="실시간 국가별" icon={Radio} items={data.realtimeByCountry} unit="명" emptyText="현재 활성 사용자 없음" />
          </div>

          <p className="text-center text-xs text-[#9e9e9e]">
            데이터 출처: Google Analytics 4 · 갱신: {new Date(data.updatedAt).toLocaleString("ko-KR")}
          </p>
        </>
      )}
    </div>
  );
}
