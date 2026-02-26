"use client";

import { useState } from "react";
import {
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
} from "lucide-react";
import { formatKRW, cn } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset } from "@/lib/store";
import { PageHeader, Card, Button, Badge, Alert } from "@/components/common";
import { ScoreGauge } from "@/components/results";
import { LoadingSpinner, StepIndicator } from "@/components/loading";

interface PropertyInfo {
  address: string;
  type: string;
  area: string;
  buildYear: string;
  estimatedPrice: number;
  jeonsePrice: number;
  recentTransaction: string;
}

interface RiskItem {
  level: "danger" | "warning" | "safe";
  title: string;
  description: string;
}

interface RiskAnalysis {
  jeonseRatio: number;
  mortgageRatio: number;
  safetyScore: number;
  riskScore: number;
  risks: RiskItem[];
}

interface AnalysisResult {
  propertyInfo: PropertyInfo;
  riskAnalysis: RiskAnalysis;
  aiOpinion: string;
}

const LOADING_STEPS = [
  "인터넷등기소 API 조회 중...",
  "국토교통부 실거래 API 조회 중...",
  "국토정보플랫폼 용도지역 확인 중...",
  "법제처 법령 검증 중...",
  "AI 종합 분석 중...",
];

const QUICK_SEARCH = ["역삼 래미안", "잠실엘스", "반포자이", "송도 더샵"];

const riskBadgeVariant: Record<string, "danger" | "warning" | "success"> = {
  danger: "danger",
  warning: "warning",
  safe: "success",
};
const riskBadgeLabel: Record<string, string> = {
  danger: "위험",
  warning: "주의",
  safe: "안전",
};
const riskBadgeIcon: Record<string, typeof XCircle> = {
  danger: XCircle,
  warning: AlertTriangle,
  safe: CheckCircle,
};

function getScoreLabel(score: number) {
  if (score >= 70) return "안전";
  if (score >= 40) return "주의";
  return "위험";
}

export default function RightsAnalysisPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query?: string) => {
    const searchAddress = query || address;
    if (!searchAddress.trim()) return;

    setLoading(true);
    setLoadingStep(0);
    setResult(null);
    setError(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < LOADING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 800);

    try {
      const response = await fetch("/api/analyze-rights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: searchAddress }),
      });

      if (!response.ok) {
        throw new Error("분석 요청에 실패했습니다. 다시 시도해주세요.");
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      addAnalysis({
        type: "rights",
        typeLabel: "권리분석",
        address: data.propertyInfo?.address || searchAddress,
        summary: `안전지수 ${data.riskAnalysis?.safetyScore || 0}점, 리스크 ${data.riskAnalysis?.riskScore || 0}점`,
        data: data as unknown as Record<string, unknown>,
      });
      addOrUpdateAsset({
        address: data.propertyInfo?.address || searchAddress,
        type: data.propertyInfo?.type || "부동산",
        estimatedPrice: data.propertyInfo?.estimatedPrice || 0,
        jeonsePrice: data.propertyInfo?.jeonsePrice || 0,
        safetyScore: data.riskAnalysis?.safetyScore || 0,
        riskScore: data.riskAnalysis?.riskScore || 0,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader icon={Shield} title="권리분석" description="등기부등본 기반 AI 권리분석" />

      {/* Search Section */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="분석할 부동산 주소를 입력하세요"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>
          <Button
            icon={Search}
            onClick={() => handleSearch()}
            disabled={loading || !address.trim()}
            size="lg"
          >
            분석하기
          </Button>
        </div>

        {/* Quick Search */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">빠른 검색</span>
          {QUICK_SEARCH.map((q) => (
            <button
              key={q}
              onClick={() => {
                setAddress(q);
                handleSearch(q);
              }}
              disabled={loading}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="p-8 mb-6">
          <div className="flex flex-col items-center">
            <LoadingSpinner size="lg" variant="inline" className="mb-6" />
            <p className="text-sm font-medium text-gray-700 mb-6">
              등기부등본 분석을 진행하고 있습니다
            </p>
            <div className="w-full max-w-md">
              <StepIndicator steps={LOADING_STEPS} currentStep={loadingStep} />
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Property Info Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              부동산 기본정보
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">주소</p>
                <p className="text-sm font-medium text-gray-900">
                  {result.propertyInfo.address}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">건물유형</p>
                <p className="text-sm font-medium text-gray-900">
                  {result.propertyInfo.type}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">전용면적</p>
                <p className="text-sm font-medium text-gray-900">
                  {result.propertyInfo.area}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">건축년도</p>
                <p className="text-sm font-medium text-gray-900">
                  {result.propertyInfo.buildYear}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">추정 시세</p>
                <p className="text-sm font-bold text-blue-600">
                  {formatKRW(result.propertyInfo.estimatedPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">전세 시세</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatKRW(result.propertyInfo.jeonsePrice)}
                </p>
              </div>
            </div>
            {result.propertyInfo.recentTransaction && (
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">최근 거래</p>
                <p className="text-sm text-gray-700">
                  {result.propertyInfo.recentTransaction}
                </p>
              </div>
            )}
          </Card>

          {/* Risk Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Safety Gauge */}
            <Card className="p-6 flex flex-col items-center justify-center">
              <h3 className="text-sm font-medium text-gray-500 mb-4">안전도 점수</h3>
              <ScoreGauge
                score={result.riskAnalysis.safetyScore}
                size="lg"
                grade={getScoreLabel(result.riskAnalysis.safetyScore)}
                showLabel={false}
              />
              <div className="mt-6 grid grid-cols-2 gap-4 w-full text-center">
                <div>
                  <p className="text-xs text-gray-400">전세가율</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.riskAnalysis.jeonseRatio}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">근저당비율</p>
                  <p className="text-lg font-bold text-gray-900">
                    {result.riskAnalysis.mortgageRatio}%
                  </p>
                </div>
              </div>
            </Card>

            {/* Risk Items */}
            <Card className="lg:col-span-2 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">위험 분석 항목</h3>
              <div className="space-y-3">
                {result.riskAnalysis.risks.map((risk, i) => {
                  const config = {
                    danger: {
                      bg: "bg-red-50 border-red-200",
                      text: "text-red-700",
                      descText: "text-red-600",
                      icon: XCircle,
                      iconColor: "text-red-500",
                    },
                    warning: {
                      bg: "bg-amber-50 border-amber-200",
                      text: "text-amber-700",
                      descText: "text-amber-600",
                      icon: AlertTriangle,
                      iconColor: "text-amber-500",
                    },
                    safe: {
                      bg: "bg-emerald-50 border-emerald-200",
                      text: "text-emerald-700",
                      descText: "text-emerald-600",
                      icon: CheckCircle,
                      iconColor: "text-emerald-500",
                    },
                  };

                  const c = config[risk.level];
                  const Icon = c.icon;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-4",
                        c.bg
                      )}
                    >
                      <Icon size={18} className={cn("mt-0.5 flex-shrink-0", c.iconColor)} />
                      <div>
                        <p className={cn("text-sm font-medium", c.text)}>{risk.title}</p>
                        <p className={cn("text-xs mt-1", c.descText)}>{risk.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* AI Opinion */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI 종합 의견</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {result.aiOpinion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
