"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NegotiationResult {
  strategy: string;
  recommendedScript: string;
  cautions: string;
  expectedOutcome: string;
}

export interface NegotiationForm {
  transactionType: string;
  role: string;
  propertyPrice: number;
  desiredPrice: number;
  situation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNegotiationData() {
  const [form, setForm] = useState<NegotiationForm>({
    transactionType: "전세",
    role: "매수자",
    propertyPrice: 500_000_000,
    desiredPrice: 450_000_000,
    situation: "",
  });
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = <K extends keyof NegotiationForm>(key: K, value: NegotiationForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

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
      setResult(parseSections(content));
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

  return { form, updateForm, result, loading, error, handleSubmit };
}
