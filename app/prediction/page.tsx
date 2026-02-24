"use client";

import { useState } from "react";
import { TrendingUp, Search, Loader2, BarChart3, Target, Zap } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset } from "@/lib/store";
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

interface PredictionResult {
  currentPrice: number;
  predictions: {
    base: { "1y": number; "3y": number; "5y": number; "10y": number };
    rateUp: { "1y": number; "3y": number; "5y": number; "10y": number };
    rateDown: { "1y": number; "3y": number; "5y": number; "10y": number };
    policyEase: { "1y": number; "3y": number; "5y": number; "10y": number };
  };
  variables: string[];
  confidence: number;
  aiOpinion: string;
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

      // localStorage에 분석 결과 저장
      addAnalysis({
        type: "prediction",
        typeLabel: "가치예측",
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

  const quickSearches = ["서울 강남구 역삼동 래미안", "서울 송파구 잠실엘스 84㎡", "경기 성남시 분당 정자동", "서울 서초구 반포자이"];

  const scenarios = [
    { id: "all", label: "전체 비교", color: "#000" },
    { id: "base", label: "기본", color: "#2563eb" },
    { id: "rateUp", label: "금리인상 (+1%p)", color: "#ef4444" },
    { id: "rateDown", label: "금리인하 (-1%p)", color: "#10b981" },
    { id: "policyEase", label: "정책완화", color: "#f59e0b" },
  ];

  const getChartData = () => {
    if (!result) return [];
    const years = [
      { year: "현재", base: result.currentPrice, rateUp: result.currentPrice, rateDown: result.currentPrice, policyEase: result.currentPrice },
      { year: "1년 후", base: result.predictions.base["1y"], rateUp: result.predictions.rateUp["1y"], rateDown: result.predictions.rateDown["1y"], policyEase: result.predictions.policyEase["1y"] },
      { year: "3년 후", base: result.predictions.base["3y"], rateUp: result.predictions.rateUp["3y"], rateDown: result.predictions.rateDown["3y"], policyEase: result.predictions.policyEase["3y"] },
      { year: "5년 후", base: result.predictions.base["5y"], rateUp: result.predictions.rateUp["5y"], rateDown: result.predictions.rateDown["5y"], policyEase: result.predictions.policyEase["5y"] },
      { year: "10년 후", base: result.predictions.base["10y"], rateUp: result.predictions.rateUp["10y"], rateDown: result.predictions.rateDown["10y"], policyEase: result.predictions.policyEase["10y"] },
    ];
    return years;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-primary" size={28} />
          가치예측
        </h1>
        <p className="text-secondary mt-1">AI 기반 부동산 가치 예측 및 시나리오 분석</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="예측할 부동산 주소를 입력하세요"
            className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !address.trim()}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            예측 분석
          </button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {quickSearches.map((q) => (
            <button
              key={q}
              onClick={() => { setAddress(q); }}
              className="px-3 py-1.5 text-xs bg-gray-100 text-secondary rounded-full hover:bg-gray-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-secondary">AI가 부동산 가치를 예측하고 있습니다...</p>
          <p className="text-xs text-muted mt-2">실거래가, 경제지표, 정책 변수를 분석 중</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Current Price & Confidence */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <BarChart3 size={16} />
                현재 추정 시세
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatKRW(result.currentPrice)}
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <Target size={16} />
                예측 신뢰도
              </div>
              <div className="text-2xl font-bold text-emerald-600">{result.confidence}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                <Zap size={16} />
                반영 변수
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {result.variables.map((v, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Scenario Tabs */}
          <div className="bg-card rounded-xl border border-border p-6">
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
                  <YAxis tickFormatter={(v) => `${(v / 100000000).toFixed(0)}억`} />
                  <Tooltip formatter={(value) => [formatKRW(Number(value)), ""]} />
                  <Legend />
                  {(activeScenario === "all" || activeScenario === "base") && (
                    <Line type="monotone" dataKey="base" name="기본" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                  )}
                  {(activeScenario === "all" || activeScenario === "rateUp") && (
                    <Line type="monotone" dataKey="rateUp" name="금리인상" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
                  )}
                  {(activeScenario === "all" || activeScenario === "rateDown") && (
                    <Line type="monotone" dataKey="rateDown" name="금리인하" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
                  )}
                  {(activeScenario === "all" || activeScenario === "policyEase") && (
                    <Line type="monotone" dataKey="policyEase" name="정책완화" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prediction Table */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">시나리오별 예측 상세</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-secondary">시나리오</th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">1년 후</th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">3년 후</th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">5년 후</th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">10년 후</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "base" as const, label: "기본", color: "text-blue-600" },
                    { key: "rateUp" as const, label: "금리인상", color: "text-red-600" },
                    { key: "rateDown" as const, label: "금리인하", color: "text-emerald-600" },
                    { key: "policyEase" as const, label: "정책완화", color: "text-amber-600" },
                  ].map((scenario) => (
                    <tr key={scenario.key} className="border-b border-border/50 hover:bg-gray-50">
                      <td className={cn("py-3 px-4 font-medium", scenario.color)}>{scenario.label}</td>
                      <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["1y"])}</td>
                      <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["3y"])}</td>
                      <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["5y"])}</td>
                      <td className="text-right py-3 px-4 font-semibold">{formatKRW(result.predictions[scenario.key]["10y"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
}
