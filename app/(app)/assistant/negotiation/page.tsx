"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/common";
import { LoadingSpinner } from "@/components/loading";
import { formatNumber, formatKRW, parseNumber } from "@/lib/format";

interface NegotiationResult {
  strategy: string;
  recommendedScript: string;
  cautions: string;
  expectedOutcome: string;
}

export default function NegotiationCoachPage() {
  const [form, setForm] = useState({
    transactionType: "전세",
    role: "매수자",
    propertyPrice: 500_000_000,
    desiredPrice: 450_000_000,
    situation: "",
  });
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const prompt = `당신은 부동산 협상 전문 코치입니다. 아래 협상 상황을 분석하고 구체적인 협상 전략을 제시해주세요.

[협상 정보]
- 거래 유형: ${form.transactionType}
- 내 역할: ${form.role}
- 매물 가격: ${formatNumber(form.propertyPrice)}원
- 희망 가격: ${formatNumber(form.desiredPrice)}원
- 가격 차이: ${formatNumber(Math.abs(form.propertyPrice - form.desiredPrice))}원
- 협상 상황: ${form.situation || "특별한 상황 없음"}

아래 형식으로 답변해주세요. 각 섹션은 반드시 해당 제목으로 시작해야 합니다:

## 협상 전략 요약
(전체적인 협상 방향과 핵심 전략을 3-5문장으로 요약)

## 추천 멘트
(실제 협상에서 사용할 수 있는 구체적인 대화 예시 3-5개를 번호를 매겨 제시)

## 주의사항
(협상 시 피해야 할 행동이나 주의해야 할 점 3-5개)

## 예상 결과
(이 전략을 사용했을 때 예상되는 협상 결과와 현실적인 기대치)`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const content: string = data.content || "";

      // Parse sections from the AI response
      const sections = parseSections(content);
      setResult(sections);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "응답 생성 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

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
              onChange={(e) =>
                setForm((p) => ({ ...p, transactionType: e.target.value }))
              }
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
              onChange={(e) =>
                setForm((p) => ({ ...p, role: e.target.value }))
              }
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
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  propertyPrice: parseNumber(e.target.value),
                }))
              }
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
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  desiredPrice: parseNumber(e.target.value),
                }))
              }
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
              onChange={(e) =>
                setForm((p) => ({ ...p, situation: e.target.value }))
              }
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
          <ResultSection
            title="협상 전략 요약"
            content={result.strategy}
            color="indigo"
          />
          <ResultSection
            title="추천 멘트 (구체적 대화 예시)"
            content={result.recommendedScript}
            color="green"
          />
          <ResultSection
            title="주의사항"
            content={result.cautions}
            color="amber"
          />
          <ResultSection
            title="예상 결과"
            content={result.expectedOutcome}
            color="blue"
          />
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
    indigo: {
      border: "border-indigo-200",
      bg: "bg-indigo-50",
      title: "text-indigo-700",
    },
    green: {
      border: "border-green-200",
      bg: "bg-green-50",
      title: "text-green-700",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      title: "text-amber-700",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      title: "text-blue-700",
    },
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

function parseSections(content: string): NegotiationResult {
  const getSection = (heading: string, nextHeadings: string[]): string => {
    const pattern = new RegExp(
      `##\\s*${heading}[\\s\\S]*?\\n([\\s\\S]*?)(?=##\\s*(?:${nextHeadings.join("|")})|$)`
    );
    const match = content.match(pattern);
    return match ? match[1].trim() : "";
  };

  const allHeadings = ["협상 전략 요약", "추천 멘트", "주의사항", "예상 결과"];

  return {
    strategy:
      getSection("협상 전략 요약", allHeadings.slice(1)) ||
      "전략 요약을 생성하지 못했습니다.",
    recommendedScript:
      getSection("추천 멘트", allHeadings.slice(2)) ||
      "추천 멘트를 생성하지 못했습니다.",
    cautions:
      getSection("주의사항", allHeadings.slice(3)) ||
      "주의사항을 생성하지 못했습니다.",
    expectedOutcome:
      getSection("예상 결과", []) || "예상 결과를 생성하지 못했습니다.",
  };
}
