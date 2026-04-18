"use client";

import { MessageSquare } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { LoadingSpinner } from "@/components/loading";
import { formatNumber, formatKRW, parseNumber } from "@/lib/format";
import { useNegotiationData } from "./hooks/useNegotiationData";

export default function NegotiationCoachPage() {
  const { form, updateForm, result, loading, error, handleSubmit } = useNegotiationData();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <PageHeader
        icon={MessageSquare}
        title="AI 협상 코치"
        description="매매/전세 협상 시나리오를 AI가 시뮬레이션합니다"
      />

      {/* 입력 폼 */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">
          협상 정보 입력
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              거래 유형
            </label>
            <select
              value={form.transactionType}
              onChange={(e) => updateForm("transactionType", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="전세">전세</option>
              <option value="매매">매매</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              내 역할
            </label>
            <select
              value={form.role}
              onChange={(e) => updateForm("role", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="매수자">매수자</option>
              <option value="매도자">매도자</option>
              <option value="임차인">임차인</option>
              <option value="임대인">임대인</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              매물 가격
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.propertyPrice)}
              onChange={(e) => updateForm("propertyPrice", parseNumber(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.propertyPrice)}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              희망 가격
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(form.desiredPrice)}
              onChange={(e) => updateForm("desiredPrice", parseNumber(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              {formatKRW(form.desiredPrice)}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              협상 상황 설명
            </label>
            <textarea
              value={form.situation}
              onChange={(e) => updateForm("situation", e.target.value)}
              placeholder="예: 매물이 3개월째 안 팔리고 있어요"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="lg"
          className="mt-5 w-full sm:w-auto"
        >
          {loading ? "분석 중..." : "협상 전략 분석"}
        </Button>
      </Card>

      {/* 로딩 */}
      {loading && (
        <Card className="p-8 flex items-center justify-center gap-3">
          <LoadingSpinner size="md" variant="inline" />
          <span className="text-sm text-gray-500">
            AI가 협상 전략을 분석하고 있습니다...
          </span>
        </Card>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="space-y-4">
          <ResultSection title="협상 전략 요약" content={result.strategy} color="indigo" />
          <ResultSection title="추천 멘트 (구체적 대화 예시)" content={result.recommendedScript} color="green" />
          <ResultSection title="주의사항" content={result.cautions} color="amber" />
          <ResultSection title="예상 결과" content={result.expectedOutcome} color="blue" />
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  content,
  color,
}: {
  title: string;
  content: string;
  color: "indigo" | "green" | "amber" | "blue";
}) {
  const colorMap = {
    indigo: { border: "border-indigo-200", bg: "bg-indigo-50", title: "text-indigo-700" },
    green: { border: "border-green-200", bg: "bg-green-50", title: "text-green-700" },
    amber: { border: "border-amber-200", bg: "bg-amber-50", title: "text-amber-700" },
    blue: { border: "border-blue-200", bg: "bg-blue-50", title: "text-blue-700" },
  };

  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <h3 className={`text-sm font-bold ${c.title} mb-3`}>{title}</h3>
      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
