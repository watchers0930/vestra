"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  BarChart3,
  Target,
  Zap,
  MapPin,
  Database,
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset } from "@/lib/store";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageHeader, Card, Button, Alert } from "@/components/common";
import { LoadingSpinner } from "@/components/loading";
import { KakaoMap } from "@/components/prediction/KakaoMap";

interface RealTransaction {
  dealAmount: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
  floor: number;
  dong: string;
}

interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

interface PredictionResult {
  currentPrice: number;
  predictions: {
    optimistic: { "1y": number; "5y": number; "10y": number };
    base: { "1y": number; "5y": number; "10y": number };
    pessimistic: { "1y": number; "5y": number; "10y": number };
  };
  variables: string[];
  factors: PredictionFactor[];
  confidence: number;
  aiOpinion: string;
  realTransactions: RealTransaction[];
  priceStats: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    transactionCount: number;
    period: string;
  } | null;
}

export default function PredictionPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("all");

  const handleAnalyze = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/predict-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      addAnalysis({
        type: "prediction",
        typeLabel: "시세전망",
        address: address.trim(),
        summary: `현재 ${formatKRW(data.currentPrice)}, 신뢰도 ${data.confidence}%`,
        data: data as Record<string, unknown>,
      });
      addOrUpdateAsset({
        address: address.trim(),
        type: "부동산",
        estimatedPrice: data.currentPrice,
        safetyScore: data.confidence,
        riskScore: 100 - data.confidence,
      });
    } catch {
      alert("분석 중 오류가 발생했습니다. API 키를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const quickSearches = [
    "서울 강남구 역삼동 래미안",
    "서울 송파구 잠실엘스 84㎡",
    "서울 서초구 반포자이",
    "서울 마포구 래미안푸르지오",
  ];

  const scenarios = [
    { id: "all", label: "전체 비교", color: "#000" },
    { id: "optimistic", label: "낙관적", color: "#10b981" },
    { id: "base", label: "기본", color: "#2563eb" },
    { id: "pessimistic", label: "비관적", color: "#ef4444" },
  ];

  const getChartData = () => {
    if (!result) return [];
    return [
      {
        year: "현재",
        optimistic: result.currentPrice,
        base: result.currentPrice,
        pessimistic: result.currentPrice,
      },
      {
        year: "1년 후",
        optimistic: result.predictions.optimistic["1y"],
        base: result.predictions.base["1y"],
        pessimistic: result.predictions.pessimistic["1y"],
      },
      {
        year: "5년 후",
        optimistic: result.predictions.optimistic["5y"],
        base: result.predictions.base["5y"],
        pessimistic: result.predictions.pessimistic["5y"],
      },
      {
        year: "10년 후",
        optimistic: result.predictions.optimistic["10y"],
        base: result.predictions.base["10y"],
        pessimistic: result.predictions.pessimistic["10y"],
      },
    ];
  };

  const getHistoricalData = () => {
    if (!result?.realTransactions?.length) return [];
    return result.realTransactions
      .slice()
      .sort(
        (a, b) =>
          a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay -
          (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
      )
      .map((t) => ({
        date: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}`,
        price: t.dealAmount,
        label: `${t.aptName} ${t.area}㎡`,
      }));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        icon={TrendingUp}
        title="시세전망"
        description="실거래 데이터 + AI 기반 부동산 시세 분석 및 미래 가격 전망"
      />

      {/* 메뉴명 안내 */}
      <div className="mb-6 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700 leading-relaxed">
          💡 <span className="font-medium">왜 &apos;시세전망&apos;인가요?</span> — 단순한 미래 가격 예측이 아닌, 국토교통부 실거래 데이터를 기반으로 현재 시세를 정밀 분석한 뒤 시장 변수를 반영하여 전망하기 때문입니다.
          실데이터에 근거한 분석이라는 점에서 &apos;가치예측&apos;보다 &apos;시세전망&apos;이 본 서비스의 성격을 더 정확히 나타냅니다.
        </p>
      </div>

      {/* Search */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="예측할 부동산 주소를 입력하세요"
            className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
          <Button
            icon={Search}
            loading={loading}
            disabled={!address.trim()}
            size="lg"
            onClick={handleAnalyze}
          >
            예측 분석
          </Button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {quickSearches.map((q) => (
            <button
              key={q}
              onClick={() => setAddress(q)}
              className="px-3 py-1.5 text-xs bg-gray-100 text-secondary rounded-full hover:bg-gray-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* Map */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MapPin size={16} />
          위치
        </h3>
        {address.trim() ? (
          <KakaoMap address={address} />
        ) : (
          <div className="h-[300px] rounded-xl bg-gray-100 flex items-center justify-center text-secondary text-sm">
            지역을 선택해 주세요
          </div>
        )}
      </Card>

      {/* Loading */}
      {loading && (
        <LoadingSpinner message="실거래 데이터 수집 및 AI 가치 예측 분석 중입니다..." />
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <BarChart3 size={16} />
                현재 추정 시세
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatKRW(result.currentPrice)}
              </div>
              {result.priceStats && (
                <p className="text-xs text-muted mt-1">
                  실거래 평균 {formatKRW(result.priceStats.avgPrice)}
                </p>
              )}
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <Target size={16} />
                예측 신뢰도
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {result.confidence}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <Database size={16} />
                실거래 데이터
              </div>
              {result.priceStats ? (
                <>
                  <div className="text-2xl font-bold">
                    {result.priceStats.transactionCount}건
                  </div>
                  <p className="text-xs text-muted mt-1">{result.priceStats.period}</p>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium text-muted">데이터 없음</div>
                  <p className="text-xs text-muted mt-1">
                    MOLIT API 키를 설정하세요
                  </p>
                </>
              )}
            </Card>
          </div>

          {/* Historical Chart */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 size={16} />
              실거래가 추이
            </h3>
            {getHistoricalData().length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getHistoricalData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `${(v / 100000000).toFixed(1)}억`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [formatKRW(Number(value)), "거래가"]}
                      labelFormatter={(label) => `거래시점: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-secondary text-sm">
                실거래 데이터가 없습니다
              </div>
            )}
          </Card>

          {/* Scenario Prediction Chart */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">시나리오별 가격 예측</h3>
              <div className="flex flex-wrap gap-1.5">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveScenario(s.id)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full border transition-all",
                      activeScenario === s.id
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-secondary border-border hover:bg-gray-50"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    tickFormatter={(v) => `${(v / 100000000).toFixed(0)}억`}
                  />
                  <Tooltip
                    formatter={(value) => [formatKRW(Number(value)), ""]}
                  />
                  <Legend />
                  {(activeScenario === "all" ||
                    activeScenario === "optimistic") && (
                    <Line
                      type="monotone"
                      dataKey="optimistic"
                      name="낙관적"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      strokeDasharray={
                        activeScenario === "all" ? "5 5" : "0"
                      }
                    />
                  )}
                  {(activeScenario === "all" || activeScenario === "base") && (
                    <Line
                      type="monotone"
                      dataKey="base"
                      name="기본"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  )}
                  {(activeScenario === "all" ||
                    activeScenario === "pessimistic") && (
                    <Line
                      type="monotone"
                      dataKey="pessimistic"
                      name="비관적"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      strokeDasharray={
                        activeScenario === "all" ? "5 5" : "0"
                      }
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Factor Analysis */}
          {result.factors && result.factors.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap size={16} />
                가격 영향 요인 분석
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.factors.map((factor, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-border bg-gray-50/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {factor.impact === "positive" && (
                        <TrendingUp size={16} className="text-emerald-600" />
                      )}
                      {factor.impact === "negative" && (
                        <TrendingDown size={16} className="text-red-600" />
                      )}
                      {factor.impact === "neutral" && (
                        <Minus size={16} className="text-gray-500" />
                      )}
                      <span className="font-medium text-sm">{factor.name}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded-full font-medium",
                          factor.impact === "positive" &&
                            "bg-emerald-100 text-emerald-700",
                          factor.impact === "negative" &&
                            "bg-red-100 text-red-700",
                          factor.impact === "neutral" &&
                            "bg-gray-100 text-gray-600"
                        )}
                      >
                        {factor.impact === "positive"
                          ? "상승요인"
                          : factor.impact === "negative"
                          ? "하락요인"
                          : "중립"}
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      {factor.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Prediction Detail Table */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">시나리오별 예측 상세</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-secondary">
                      시나리오
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">
                      1년 후
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">
                      5년 후
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">
                      10년 후
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      key: "optimistic" as const,
                      label: "낙관적",
                      color: "text-emerald-600",
                    },
                    {
                      key: "base" as const,
                      label: "기본",
                      color: "text-blue-600",
                    },
                    {
                      key: "pessimistic" as const,
                      label: "비관적",
                      color: "text-red-600",
                    },
                  ].map((scenario) => (
                    <tr
                      key={scenario.key}
                      className="border-b border-border/50 hover:bg-gray-50"
                    >
                      <td className={cn("py-3 px-4 font-medium", scenario.color)}>
                        {scenario.label}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatKRW(result.predictions[scenario.key]["1y"])}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatKRW(result.predictions[scenario.key]["5y"])}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatKRW(result.predictions[scenario.key]["10y"])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Real Transaction History */}
          {result.realTransactions && result.realTransactions.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">
                실거래 내역
                {result.priceStats && (
                  <span className="text-sm font-normal text-secondary ml-2">
                    ({result.priceStats.period} / {result.priceStats.transactionCount}건)
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-secondary">
                        아파트
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">
                        거래가
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">
                        면적
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">
                        층
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">
                        거래일
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.realTransactions.slice(0, 20).map((t, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/50 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{t.aptName}</td>
                        <td className="text-right py-3 px-4 font-medium">
                          {formatKRW(t.dealAmount)}
                        </td>
                        <td className="text-right py-3 px-4">{t.area}㎡</td>
                        <td className="text-right py-3 px-4">{t.floor}층</td>
                        <td className="text-right py-3 px-4 text-secondary">
                          {t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.
                          {String(t.dealDay).padStart(2, "0")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* AI Opinion */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <TrendingUp size={20} />
              AI 분석 의견
            </h3>
            <p className="text-blue-900 text-sm leading-relaxed whitespace-pre-line">
              {result.aiOpinion}
            </p>
          </div>

          {/* Reflected Variables */}
          {result.variables && result.variables.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-3">
                <Zap size={16} />
                반영 변수
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.variables.map((v, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <Alert variant="warning">
            <strong>면책 조항 (Disclaimer)</strong>
            <br />
            본 분석은 AI(인공지능) 기반의 참고 자료이며, 투자 조언이 아닙니다.
            실거래 데이터는 국토교통부 공공데이터를 기반으로 하나, 실시간 시세와
            차이가 있을 수 있습니다. 부동산 투자 결정 시 반드시 공인중개사,
            감정평가사 등 전문가와 상담하시기 바랍니다. VESTRA는 본 분석 결과에
            따른 투자 손실에 대해 책임을 지지 않습니다.
          </Alert>
        </div>
      )}
    </div>
  );
}
