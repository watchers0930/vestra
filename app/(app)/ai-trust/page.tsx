"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Activity,
  Clock,
  BarChart3,
  Database,
  RefreshCw,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/common/Card";
import { formatNumber } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ModelAccuracy {
  id: string;
  name: string;
  accuracy: number;
  totalAnalyses: number;
  expertAgreementRate: number;
  lastUpdated: string;
  description: string;
  dataSources: string[];
}

interface MonthlyTrend {
  month: string;
  jeonse: number;
  rights: number;
  prediction: number;
  contract: number;
}

interface TrustData {
  overview: {
    totalAnalyses: number;
    avgAccuracy: number;
    avgProcessingTime: number;
    lastVerificationDate: string;
    verificationCycle: string;
  };
  models: ModelAccuracy[];
  trends: MonthlyTrend[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function AccuracyBar({ value, label }: { value: number; label: string }) {
  const color =
    value >= 95
      ? "bg-emerald-500"
      : value >= 90
        ? "bg-blue-500"
        : value >= 85
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[#1d1d1f]">{label}</span>
        <span className="text-sm font-semibold text-[#1d1d1f]">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#f5f5f7] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------
const CHART_COLORS = {
  jeonse: "#10b981",
  rights: "#3b82f6",
  prediction: "#f59e0b",
  contract: "#8b5cf6",
};

const CHART_LABELS: Record<string, string> = {
  jeonse: "전세 안전도",
  rights: "권리분석",
  prediction: "시세전망",
  contract: "계약검토",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AiTrustPage() {
  const [data, setData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-trust")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          icon={ShieldCheck}
          title="AI 분석 신뢰도"
          description="VESTRA AI 분석의 정확도와 투명성을 확인하세요"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-[#f5f5f7] animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-[#f5f5f7] animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { overview, models, trends } = data;

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="AI 분석 신뢰도"
        description="VESTRA AI 분석의 정확도와 투명성을 확인하세요"
      />

      {/* ───── Overview KPIs ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <BarChart3 className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-[#6e6e73]">총 분석 건수</p>
              <p className="text-lg font-semibold text-[#1d1d1f]">
                {formatNumber(overview.totalAnalyses)}건
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <CheckCircle2 className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-[#6e6e73]">평균 정확도</p>
              <p className="text-lg font-semibold text-[#1d1d1f]">
                {overview.avgAccuracy}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-[#6e6e73]">평균 처리 시간</p>
              <p className="text-lg font-semibold text-[#1d1d1f]">
                {overview.avgProcessingTime}초
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50">
              <RefreshCw className="h-5 w-5 text-purple-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-[#6e6e73]">검증 주기</p>
              <p className="text-lg font-semibold text-[#1d1d1f]">
                {overview.verificationCycle}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───── Model Accuracy ───── */}
      <Card className="mb-8">
        <CardContent>
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">
            모델별 전문가 일치율
          </h2>
          <p className="text-sm text-[#6e6e73] mb-6">
            각 AI 분석 모델의 정확도를 전문가 검증 결과와 비교한 수치입니다
          </p>

          <div className="space-y-6">
            {models.map((model) => {
              const isExpanded = expandedModel === model.id;
              return (
                <div key={model.id}>
                  <button
                    className="w-full text-left"
                    onClick={() =>
                      setExpandedModel(isExpanded ? null : model.id)
                    }
                  >
                    <AccuracyBar
                      value={model.accuracy}
                      label={`${model.name} — 전문가 일치율 ${model.accuracy}%`}
                    />
                  </button>

                  {/* Expandable detail */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? "max-h-60 opacity-100 mt-3" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pl-1 border-l-2 border-[#e5e5e7] ml-1 space-y-2">
                      <div className="pl-4">
                        <p className="text-sm text-[#424245] leading-relaxed">
                          {model.description}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#6e6e73]">
                          <span className="flex items-center gap-1">
                            <Activity size={12} />총{" "}
                            {formatNumber(model.totalAnalyses)}건 분석
                          </span>
                          <span className="flex items-center gap-1">
                            <RefreshCw size={12} />
                            최종 검증: {model.lastUpdated}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {model.dataSources.map((ds) => (
                            <span
                              key={ds}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[10px] text-[#424245] border border-[#e5e5e7]"
                            >
                              <Database size={9} />
                              {ds}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ───── Monthly Trend Chart ───── */}
      <Card className="mb-8">
        <CardContent>
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">
            월별 정확도 추이
          </h2>
          <p className="text-sm text-[#6e6e73] mb-6">
            최근 6개월간 모델별 전문가 일치율 변화 추이
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#6e6e73" }}
                  axisLine={{ stroke: "#e5e5e7" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[80, 100]}
                  tick={{ fontSize: 12, fill: "#6e6e73" }}
                  axisLine={{ stroke: "#e5e5e7" }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${value}%`,
                    CHART_LABELS[name as string] || name,
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e5e5e7",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    fontSize: 13,
                  }}
                />
                <Legend
                  formatter={(value: string) => CHART_LABELS[value] || value}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "#6e6e73" }}
                />
                {Object.entries(CHART_COLORS).map(([key, color]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ───── Methodology & Update Info ───── */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">
            분석 방법론 및 검증 절차
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Methodology */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f]">
                    데이터 수집
                  </p>
                  <p className="text-xs text-[#6e6e73] mt-0.5 leading-relaxed">
                    국토교통부, 대법원, 한국은행 등 공공 데이터를 실시간 연동합니다
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f]">
                    AI 분석 수행
                  </p>
                  <p className="text-xs text-[#6e6e73] mt-0.5 leading-relaxed">
                    LLM과 자체 알고리즘을 결합하여 다각도 분석을 수행합니다
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f]">
                    전문가 검증
                  </p>
                  <p className="text-xs text-[#6e6e73] mt-0.5 leading-relaxed">
                    매월 샘플 분석 결과를 공인중개사·법무사가 교차 검증합니다
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1d1d1f]">
                    모델 개선
                  </p>
                  <p className="text-xs text-[#6e6e73] mt-0.5 leading-relaxed">
                    검증 결과를 반영하여 분석 모델의 정확도를 지속적으로 개선합니다
                  </p>
                </div>
              </div>
            </div>

            {/* Update info */}
            <div className="rounded-xl bg-[#f5f5f7] p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#1d1d1f]">
                <Info size={16} className="text-[#6e6e73]" />
                실시간 업데이트 안내
              </div>
              <ul className="space-y-2.5 text-sm text-[#424245]">
                <li className="flex items-start gap-2">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-500 mt-0.5 flex-shrink-0"
                  />
                  매월 전문가 검증 결과를 반영하여 정확도 수치를 갱신합니다
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-500 mt-0.5 flex-shrink-0"
                  />
                  분석 건수와 처리 시간은 실시간으로 집계됩니다
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-500 mt-0.5 flex-shrink-0"
                  />
                  정확도가 기준치(85%) 이하로 하락 시 분석 서비스를 자동 중단합니다
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-500 mt-0.5 flex-shrink-0"
                  />
                  모든 분석 결과에 AI 분석임을 명시하고 전문가 상담을 권장합니다
                </li>
              </ul>
              <p className="text-xs text-[#86868b] pt-2 border-t border-[#e5e5e7]">
                최종 검증일: {overview.lastVerificationDate} · 검증 주기:{" "}
                {overview.verificationCycle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
