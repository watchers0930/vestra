"use client";

/**
 * 크로스 기능 교차 분석 카드
 * ─────────────────────────────
 * 6개 분석 규칙의 트리거 결과 및 연계 임팩트를 시각화.
 */

import { ArrowRight, Zap, ZapOff } from "lucide-react";
import { Card, CardHeader } from "@/components/common/Card";
import type { CrossAnalysisResult } from "@/lib/patent-types";

interface CrossAnalysisCardProps {
  result: CrossAnalysisResult;
}

const MODULE_LABELS: Record<string, string> = {
  registry: "권리분석",
  contract: "계약서",
  price: "시세전망",
  tax: "세무",
  jeonse: "전세보호",
  assistant: "AI 어시스턴트",
  vscore: "V-Score",
  fraud: "사기예방",
  all: "전체 모듈",
};

export default function CrossAnalysisCard({ result }: CrossAnalysisCardProps) {
  const triggered = result.links.filter((l) => l.triggered);
  const notTriggered = result.links.filter((l) => !l.triggered);

  return (
    <Card>
      <CardHeader title="크로스 기능 교차 분석" />

      {/* 요약 배지 */}
      <div className="mx-4 mb-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          <Zap size={12} />
          {result.cascadeUpdates}개 규칙 활성화
        </div>
        <div className="text-xs text-gray-400">
          전체 {result.totalLinksEvaluated}개 규칙 평가
        </div>
      </div>

      {/* 트리거된 규칙 */}
      {triggered.length > 0 && (
        <div className="mx-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            활성화된 연계
          </p>
          {triggered.map((link) => (
            <div
              key={link.linkId}
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20"
            >
              {/* 출발 → 도착 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {MODULE_LABELS[link.from] ?? link.from}
                </span>
                <ArrowRight size={12} className="text-amber-500 shrink-0" />
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {MODULE_LABELS[link.to] ?? link.to}
                </span>
              </div>
              {/* 결과 */}
              {link.result && (
                <p className="text-xs text-amber-900 dark:text-amber-200 mb-1">
                  {link.result}
                </p>
              )}
              {/* 임팩트 */}
              {link.impact && (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  → {link.impact}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 비활성 규칙 (요약) */}
      {notTriggered.length > 0 && (
        <div className="mx-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            비활성 연계
          </p>
          <div className="flex flex-wrap gap-1.5">
            {notTriggered.map((link) => (
              <div
                key={link.linkId}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                <ZapOff size={10} />
                {MODULE_LABELS[link.from] ?? link.from}
                <ArrowRight size={8} className="opacity-50" />
                {MODULE_LABELS[link.to] ?? link.to}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 */}
      {result.cascadeUpdates === 0 && (
        <div className="mx-4 mb-4 rounded-lg bg-green-50 p-3 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-300">
          모든 교차 분석 규칙이 정상 범위입니다. 특이 연계 위험이 감지되지 않았습니다.
        </div>
      )}
    </Card>
  );
}
