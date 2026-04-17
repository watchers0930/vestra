"use client";

import { Users, Clock, BarChart3, Home, TrendingUp, ShieldCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/common";
import { KpiCard } from "@/components/results";
import { ROLE_LABELS } from "../constants";
import type { Stats } from "../types";

interface Props {
  stats: Stats;
}

export function OverviewTab({ stats }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="전체 회원"
          value={`${stats.totalUsers}명`}
          description="가입 회원 수"
          icon={Users}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
        <KpiCard
          label="대기 인증"
          value={`${stats.pendingVerifications}건`}
          description="승인 대기 중"
          icon={Clock}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
        <KpiCard
          label="오늘 분석"
          value={`${stats.todayAnalyses}회`}
          description="금일 분석 횟수"
          icon={BarChart3}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
        <KpiCard
          label="등록 자산"
          value={`${stats.totalAssets}건`}
          description="총 등록 부동산"
          icon={Home}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
      </div>

      {stats.dailyTrend && stats.dailyTrend.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} strokeWidth={1.5} />
            일일 분석 추이 (최근 7일)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value}회`, "분석 횟수"]}
                  labelFormatter={(label) => `날짜: ${label}`}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">역할별 회원 분포</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.roles[role] || 0}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">시스템 요약</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">총 분석 이력</span>
            <span className="font-medium">{stats.totalAnalyses}건</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">총 등록 자산</span>
            <span className="font-medium">{stats.totalAssets}건</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={16} strokeWidth={1.5} className="text-[#1d1d1f]" />
          고유 알고리즘 현황 (v2.3.0)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "V-Score 엔진", desc: "5대 소스 가중 복합 점수화", status: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label: "전세사기 예측", desc: "15피처 SHAP 기여도 분석", status: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label: "크로스 연계", desc: "6규칙 DAG 피드백 루프", status: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label: "NLP 인터페이스", desc: "15 엔티티 Provider 패턴", status: "준비중", color: "bg-amber-50 text-amber-700 border-amber-200" },
          ].map((algo) => (
            <div key={algo.label} className={`rounded-lg border p-3 ${algo.color}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{algo.label}</span>
                <span className="text-[10px] font-medium opacity-80">{algo.status}</span>
              </div>
              <p className="text-[11px] opacity-70">{algo.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">알고리즘 버전</span>
            <span className="font-medium text-[#1d1d1f]">v2.3.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">파이프라인 단계</span>
            <span className="font-medium">13단계</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">Gap 분석</span>
            <span className="font-medium text-[#1d1d1f]">100%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
