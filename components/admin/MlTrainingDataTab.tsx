"use client";

import { useState, useCallback } from "react";
import {
  Download,
  Eye,
  Check,
  X,
  Trash2,
  Database,
  Clock,
  ShieldCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button, Badge } from "@/components/common";
import { KpiCard } from "@/components/results";
import { MlUploadSection } from "./MlUploadSection";
import { MlReviewPanel } from "./MlReviewPanel";

// ─── Types ───

export interface TrainingDataItem {
  id: string;
  status: string;
  sourceFileName: string;
  sourceType: string;
  confidence: number;
  charCount: number;
  gapguCount: number;
  eulguCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingDataDetail extends TrainingDataItem {
  rawText: string;
  parsedData: unknown;
  reviewNotes: string | null;
}

export interface Stats {
  total: number;
  pending: number;
  reviewed: number;
  approved: number;
  rejected: number;
  avgConfidence: number;
}

export type StatusFilter = "all" | "pending" | "reviewed" | "approved" | "rejected";

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

interface MlTrainingDataTabProps {
  items: TrainingDataItem[];
  stats: Stats;
  page: number;
  totalPages: number;
  statusFilter: StatusFilter;
  loading: boolean;
  bulkApproving: boolean;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onPageChange: (page: number) => void;
  onBulkApprove: () => void;
  onExportJSONL: () => void;
  onDeleteItem: (id: string) => void;
  onRefresh: () => void;
}

// ─── Component ───

export function MlTrainingDataTab({
  items,
  stats,
  page,
  totalPages,
  statusFilter,
  loading,
  bulkApproving,
  onStatusFilterChange,
  onPageChange,
  onBulkApprove,
  onExportJSONL,
  onDeleteItem,
  onRefresh,
}: MlTrainingDataTabProps) {
  // 리뷰 상태
  const [reviewItem, setReviewItem] = useState<TrainingDataDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // ─── 리뷰 열기 ───

  const openReview = useCallback(async (id: string) => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/admin/training-data/${id}`);
      if (!res.ok) throw new Error("조회 실패");
      const data: TrainingDataDetail = await res.json();
      setReviewItem(data);
    } catch {
      // 조용히 실패
    } finally {
      setReviewLoading(false);
    }
  }, []);

  // ─── 렌더링 ───

  return (
    <div className="space-y-6">
      {/* KPI 통계 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="전체 데이터"
          value={String(stats.total)}
          description="등록된 학습 데이터"
          icon={Database}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
        <KpiCard
          label="승인 대기"
          value={String(stats.pending + stats.reviewed)}
          description="검수 필요"
          icon={Clock}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
        <KpiCard
          label="승인 완료"
          value={String(stats.approved)}
          description="내보내기 가능"
          icon={ShieldCheck}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
        <KpiCard
          label="평균 신뢰도"
          value={`${stats.avgConfidence}%`}
          description="등기부등본 감지율"
          icon={BarChart3}
          iconBg="bg-[#f5f5f7]"
          iconColor="text-[#1d1d1f]"
        />
      </div>

      {/* 업로드 섹션 */}
      <MlUploadSection onRefresh={onRefresh} />

      {/* 데이터 목록 */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(["all", "pending", "reviewed", "approved", "rejected"] as StatusFilter[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => onStatusFilterChange(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === s
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  {s === "all" ? "전체" : STATUS_LABELS[s]}
                  {s === "all"
                    ? ` (${stats.total})`
                    : s === "pending"
                      ? ` (${stats.pending})`
                      : s === "reviewed"
                        ? ` (${stats.reviewed})`
                        : s === "approved"
                          ? ` (${stats.approved})`
                          : ` (${stats.rejected})`}
                </button>
              ),
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onBulkApprove}
              loading={bulkApproving}
              disabled={bulkApproving || stats.pending + stats.reviewed === 0}
              variant="secondary"
            >
              <Check size={14} strokeWidth={1.5} className="mr-1" />
              일괄 승인 ({stats.pending + stats.reviewed})
            </Button>
            <Button onClick={onExportJSONL} disabled={stats.approved === 0}>
              <Download size={14} strokeWidth={1.5} className="mr-1" />
              JSONL 내보내기 ({stats.approved})
            </Button>
          </div>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            학습 데이터가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4">파일명</th>
                  <th className="pb-2 pr-4">형식</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2 pr-4">신뢰도</th>
                  <th className="pb-2 pr-4">갑구</th>
                  <th className="pb-2 pr-4">을구</th>
                  <th className="pb-2 pr-4">글자수</th>
                  <th className="pb-2 pr-4">등록일</th>
                  <th className="pb-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 font-medium">{item.sourceFileName}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        {item.sourceType}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant={
                          STATUS_COLORS[item.status] as
                            | "neutral"
                            | "info"
                            | "success"
                            | "danger"
                        }
                      >
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              item.confidence >= 80
                                ? "bg-emerald-500"
                                : item.confidence >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500",
                            )}
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{item.confidence}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{item.gapguCount}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{item.eulguCount}</td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {item.charCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openReview(item.id)}
                          disabled={reviewLoading}
                          className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                          title="리뷰"
                        >
                          <Eye size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="삭제"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </Card>

      {/* 리뷰 패널 */}
      {reviewItem && (
        <MlReviewPanel
          reviewItem={reviewItem}
          onClose={() => setReviewItem(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
