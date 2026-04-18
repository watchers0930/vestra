"use client";

import { useState, useCallback } from "react";
import { Eye, Check, X } from "lucide-react";
import { Card, Button, Badge } from "@/components/common";
import { type TrainingDataDetail } from "./MlTrainingDataTab";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  reviewed: "검토",
  approved: "승인",
  rejected: "거부",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "neutral",
  reviewed: "info",
  approved: "success",
  rejected: "danger",
};

// ─── Props ───

interface MlReviewPanelProps {
  reviewItem: TrainingDataDetail;
  onClose: () => void;
  onRefresh: () => void;
}

// ─── Component ───

export function MlReviewPanel({ reviewItem, onClose, onRefresh }: MlReviewPanelProps) {
  const [editedParsedJson, setEditedParsedJson] = useState(
    JSON.stringify(reviewItem.parsedData, null, 2),
  );
  const [reviewNotes, setReviewNotes] = useState(reviewItem.reviewNotes || "");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (status: string) => {
      setReviewLoading(true);
      setJsonError(null);
      try {
        let parsedData: unknown;
        try {
          parsedData = JSON.parse(editedParsedJson);
        } catch {
          setJsonError("JSON 형식이 올바르지 않습니다.");
          setReviewLoading(false);
          return;
        }

        const res = await fetch(`/api/admin/training-data/${reviewItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, parsedData, reviewNotes }),
        });
        if (!res.ok) throw new Error("업데이트 실패");
        onClose();
        onRefresh();
      } catch {
        // 조용히 실패
      } finally {
        setReviewLoading(false);
      }
    },
    [reviewItem.id, editedParsedJson, reviewNotes, onClose, onRefresh],
  );

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Eye size={16} strokeWidth={1.5} className="text-primary" />
          리뷰: {reviewItem.sourceFileName}
          <Badge
            variant={
              STATUS_COLORS[reviewItem.status] as "neutral" | "info" | "success" | "danger"
            }
          >
            {STATUS_LABELS[reviewItem.status]}
          </Badge>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 원문 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            원문 텍스트 (복호화)
          </label>
          <div className="h-80 overflow-auto rounded-lg border bg-gray-50 p-3 text-xs font-mono whitespace-pre-wrap">
            {reviewItem.rawText}
          </div>
        </div>

        {/* 파싱 결과 (편집 가능) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            파싱 결과 (JSON 편집 가능)
          </label>
          <textarea
            value={editedParsedJson}
            onChange={(e) => setEditedParsedJson(e.target.value)}
            className="h-80 w-full rounded-lg border bg-white p-3 text-xs font-mono focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* JSON 오류 */}
      {jsonError && (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">{jsonError}</div>
      )}

      {/* 리뷰 노트 */}
      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-gray-500">리뷰 노트</label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="검수 의견을 입력하세요..."
          className="h-20 w-full rounded-lg border bg-white p-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* 액션 버튼 */}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          onClick={() => updateStatus("rejected")}
          disabled={reviewLoading}
          className="bg-red-500 hover:bg-red-600"
        >
          <X size={14} strokeWidth={1.5} className="mr-1" />
          거부
        </Button>
        <Button
          onClick={() => updateStatus("reviewed")}
          disabled={reviewLoading}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Eye size={14} strokeWidth={1.5} className="mr-1" />
          검토 완료
        </Button>
        <Button
          onClick={() => updateStatus("approved")}
          disabled={reviewLoading}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Check size={14} strokeWidth={1.5} className="mr-1" />
          승인
        </Button>
      </div>
    </Card>
  );
}
