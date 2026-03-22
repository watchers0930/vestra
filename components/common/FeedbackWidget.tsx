"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackWidgetProps {
  analysisId: string;
  analysisType?: string;
  className?: string;
}

type FeedbackValue = "positive" | "negative" | null;

function getStorageKey(analysisId: string): string {
  return `vestra_feedback_${analysisId}`;
}

export default function FeedbackWidget({ analysisId, analysisType = "general", className }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<FeedbackValue>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(getStorageKey(analysisId));
    if (stored === "positive" || stored === "negative") {
      setFeedback(stored);
    }
  }, [analysisId]);

  const handleFeedback = async (value: FeedbackValue) => {
    if (!value) return;
    setFeedback(value);
    localStorage.setItem(getStorageKey(analysisId), value);

    // 서버에 피드백 전송 (실패해도 UX에 영향 없음)
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          analysisType,
          rating: value,
        }),
      });
    } catch { /* 네트워크 실패 시 localStorage에는 이미 저장됨 */ }
  };

  if (feedback) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-[#6e6e73]", className)}>
        {feedback === "positive" ? (
          <ThumbsUp size={14} strokeWidth={1.5} className="text-[#1d1d1f]" />
        ) : (
          <ThumbsDown size={14} strokeWidth={1.5} className="text-[#1d1d1f]" />
        )}
        <span>피드백이 저장되었습니다. 감사합니다!</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-xs text-[#6e6e73]">이 분석이 도움이 되셨나요?</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleFeedback("positive")}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e5e7] hover:bg-[#f5f5f7] transition-colors"
          aria-label="도움이 되었어요"
        >
          <ThumbsUp size={14} strokeWidth={1.5} className="text-[#6e6e73]" />
        </button>
        <button
          onClick={() => handleFeedback("negative")}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e5e7] hover:bg-[#f5f5f7] transition-colors"
          aria-label="도움이 되지 않았어요"
        >
          <ThumbsDown size={14} strokeWidth={1.5} className="text-[#6e6e73]" />
        </button>
      </div>
    </div>
  );
}
