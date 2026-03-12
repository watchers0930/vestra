"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  Upload,
  FileText,
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
  BookOpen,
  Plus,
  Pencil,
  Sprout,
} from "lucide-react";
import { VOCAB_CATEGORIES, type VocabCategory } from "@/lib/domain-vocabulary";
import { cn } from "@/lib/utils";
import { Card, Button, Badge } from "@/components/common";
import { KpiCard } from "@/components/results";

// ─── Types ───

interface TrainingDataItem {
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

interface TrainingDataDetail extends TrainingDataItem {
  rawText: string;
  parsedData: unknown;
  reviewNotes: string | null;
}

interface Stats {
  total: number;
  pending: number;
  reviewed: number;
  approved: number;
  rejected: number;
  avgConfidence: number;
}

type StatusFilter = "all" | "pending" | "reviewed" | "approved" | "rejected";

interface VocabItem {
  id: string;
  term: string;
  category: string;
  source: string;
  frequency: number;
  definition: string | null;
}

interface VocabStats {
  total: number;
  registry_right: number;
  legal_action: number;
  structure: number;
  finance_tax: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  registry_right: "info",
  legal_action: "warning",
  structure: "neutral",
  finance_tax: "success",
};

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

// ─── Component ───

export function MlTrainingTab() {
  // 목록 상태
  const [items, setItems] = useState<TrainingDataItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, reviewed: 0, approved: 0, rejected: 0, avgConfidence: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);

  // 업로드 상태
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [rawTextInput, setRawTextInput] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 리뷰 상태
  const [reviewItem, setReviewItem] = useState<TrainingDataDetail | null>(null);
  const [editedParsedJson, setEditedParsedJson] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // 용어 관리 상태
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [vocabStats, setVocabStats] = useState<VocabStats>({ total: 0, registry_right: 0, legal_action: 0, structure: 0, finance_tax: 0 });
  const [vocabFilter, setVocabFilter] = useState<string>("all");
  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabLoading, setVocabLoading] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newCategory, setNewCategory] = useState<VocabCategory>("registry_right");
  const [newDefinition, setNewDefinition] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [editingVocab, setEditingVocab] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<VocabCategory>("registry_right");
  const [editDefinition, setEditDefinition] = useState("");

  // ─── 데이터 페칭 ───

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/training-data?status=${statusFilter}&page=${page}&limit=20`,
      );
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      setItems(data.items);
      setStats(data.stats);
      setTotalPages(data.totalPages);
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── 용어 데이터 페칭 ───

  const fetchVocab = useCallback(async () => {
    setVocabLoading(true);
    try {
      const params = new URLSearchParams();
      if (vocabFilter !== "all") params.set("category", vocabFilter);
      if (vocabSearch) params.set("search", vocabSearch);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/vocabulary?${params}`);
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      setVocabItems(data.items);
      setVocabStats(data.stats);
    } catch {
      // 조용히 실패
    } finally {
      setVocabLoading(false);
    }
  }, [vocabFilter, vocabSearch]);

  useEffect(() => {
    fetchVocab();
  }, [fetchVocab]);

  const handleAddVocab = async () => {
    if (!newTerm.trim()) return;
    try {
      const res = await fetch("/api/admin/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: newTerm.trim(), category: newCategory, definition: newDefinition || undefined }),
      });
      if (!res.ok) throw new Error("추가 실패");
      setNewTerm("");
      setNewDefinition("");
      fetchVocab();
    } catch { /* 무시 */ }
  };

  const handleDeleteVocab = async (id: string) => {
    try {
      await fetch(`/api/admin/vocabulary/${id}`, { method: "DELETE" });
      fetchVocab();
    } catch { /* 무시 */ }
  };

  const handleEditVocab = async (id: string) => {
    try {
      await fetch(`/api/admin/vocabulary/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: editCategory, definition: editDefinition }),
      });
      setEditingVocab(null);
      fetchVocab();
    } catch { /* 무시 */ }
  };

  const handleSeedVocab = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/admin/vocabulary/seed", { method: "POST" });
      if (!res.ok) throw new Error("시드 실패");
      fetchVocab();
    } catch { /* 무시 */ }
    finally { setSeedLoading(false); }
  };

  const handleExportVocab = async () => {
    const res = await fetch("/api/admin/vocabulary/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vestra-vocab-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 파일 업로드 ───

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "txt"].includes(ext || "")) {
      setUploadError("PDF 또는 TXT 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("파일 크기가 10MB를 초과합니다.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/training-data", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadSuccess(`${file.name} 업로드 완료 (신뢰도: ${data.confidence}%, 갑구: ${data.gapguCount}건, 을구: ${data.eulguCount}건)`);
      fetchData();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setIsUploading(false);
    }
  }, [fetchData]);

  const handleTextSubmit = useCallback(async () => {
    if (!rawTextInput.trim()) {
      setUploadError("텍스트를 입력해주세요.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const res = await fetch("/api/admin/training-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: rawTextInput, sourceFileName: "직접입력" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadSuccess(`텍스트 등록 완료 (신뢰도: ${data.confidence}%, 갑구: ${data.gapguCount}건, 을구: ${data.eulguCount}건)`);
      setRawTextInput("");
      fetchData();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setIsUploading(false);
    }
  }, [rawTextInput, fetchData]);

  // ─── 드래그앤드롭 ───

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFileUpload(files);
    if (e.target) e.target.value = "";
  }, [handleFileUpload]);

  // ─── 리뷰 ───

  const openReview = useCallback(async (id: string) => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/admin/training-data/${id}`);
      if (!res.ok) throw new Error("조회 실패");
      const data: TrainingDataDetail = await res.json();
      setReviewItem(data);
      setEditedParsedJson(JSON.stringify(data.parsedData, null, 2));
      setReviewNotes(data.reviewNotes || "");
    } catch {
      // 조용히 실패
    } finally {
      setReviewLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (status: string) => {
    if (!reviewItem) return;
    setReviewLoading(true);
    try {
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(editedParsedJson);
      } catch {
        setUploadError("JSON 형식이 올바르지 않습니다.");
        setReviewLoading(false);
        return;
      }

      const res = await fetch(`/api/admin/training-data/${reviewItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, parsedData, reviewNotes }),
      });
      if (!res.ok) throw new Error("업데이트 실패");
      setReviewItem(null);
      fetchData();
    } catch {
      // 조용히 실패
    } finally {
      setReviewLoading(false);
    }
  }, [reviewItem, editedParsedJson, reviewNotes, fetchData]);

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/training-data/${id}`, { method: "DELETE" });
    fetchData();
  }, [fetchData]);

  // ─── 일괄 승인 ───

  const [bulkApproving, setBulkApproving] = useState(false);

  const bulkApprove = useCallback(async () => {
    if (!confirm(`대기/검토 중인 ${stats.pending + stats.reviewed}건을 모두 승인하시겠습니까?`)) return;
    setBulkApproving(true);
    try {
      const res = await fetch("/api/admin/training-data/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minConfidence: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadSuccess(`${data.approved}건 일괄 승인 완료`);
      fetchData();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "일괄 승인 실패");
    } finally {
      setBulkApproving(false);
    }
  }, [stats.pending, stats.reviewed, fetchData]);

  // ─── JSONL 내보내기 ───

  const exportJSONL = useCallback(async () => {
    const res = await fetch("/api/admin/training-data/export");
    if (!res.ok) {
      const data = await res.json();
      setUploadError(data.error || "내보내기 실패");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vestra-training-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ─── 렌더링 ───

  return (
    <div className="space-y-6">
      {/* KPI 통계 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="전체 데이터" value={String(stats.total)} description="등록된 학습 데이터" icon={Database} iconBg="bg-[#f5f5f7]" iconColor="text-[#1d1d1f]" />
        <KpiCard label="승인 대기" value={String(stats.pending + stats.reviewed)} description="검수 필요" icon={Clock} iconBg="bg-[#f5f5f7]" iconColor="text-[#1d1d1f]" />
        <KpiCard label="승인 완료" value={String(stats.approved)} description="내보내기 가능" icon={ShieldCheck} iconBg="bg-[#f5f5f7]" iconColor="text-[#1d1d1f]" />
        <KpiCard label="평균 신뢰도" value={`${stats.avgConfidence}%`} description="등기부등본 감지율" icon={BarChart3} iconBg="bg-[#f5f5f7]" iconColor="text-[#1d1d1f]" />
      </div>

      {/* 업로드 섹션 */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Brain size={16} strokeWidth={1.5} className="text-primary" />
          등기부등본 학습 데이터 등록
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 파일 업로드 */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
              isDragging ? "border-primary bg-primary/5" :
              "border-border hover:border-primary/50 hover:bg-gray-50",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-primary">처리 중...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} strokeWidth={1.5} className="text-gray-400" />
                <p className="text-sm text-gray-600">PDF/TXT 파일을 드래그하세요</p>
                <p className="text-xs text-gray-400">최대 10MB, AES-256-GCM 암호화 저장</p>
              </div>
            )}
          </div>

          {/* 텍스트 직접 입력 */}
          <div className="flex flex-col gap-2">
            <textarea
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder="등기부등본 텍스트를 직접 붙여넣기..."
              className="h-32 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm focus:border-primary focus:outline-none"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={isUploading || !rawTextInput.trim()}
              className="self-end"
            >
              <FileText size={14} strokeWidth={1.5} className="mr-1" />
              분석 및 등록
            </Button>
          </div>
        </div>

        {/* 메시지 */}
        {uploadError && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{uploadError}</div>
        )}
        {uploadSuccess && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">{uploadSuccess}</div>
        )}
      </Card>

      {/* 데이터 목록 */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(["all", "pending", "reviewed", "approved", "rejected"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {s === "all" ? "전체" : STATUS_LABELS[s]}
                {s === "all" ? ` (${stats.total})` :
                 s === "pending" ? ` (${stats.pending})` :
                 s === "reviewed" ? ` (${stats.reviewed})` :
                 s === "approved" ? ` (${stats.approved})` :
                 ` (${stats.rejected})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={bulkApprove}
              loading={bulkApproving}
              disabled={bulkApproving || (stats.pending + stats.reviewed) === 0}
              variant="secondary"
            >
              <Check size={14} strokeWidth={1.5} className="mr-1" />
              일괄 승인 ({stats.pending + stats.reviewed})
            </Button>
            <Button onClick={exportJSONL} disabled={stats.approved === 0}>
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
          <div className="py-10 text-center text-sm text-gray-400">학습 데이터가 없습니다.</div>
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
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{item.sourceType}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={STATUS_COLORS[item.status] as "neutral" | "info" | "success" | "danger"}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              item.confidence >= 80 ? "bg-emerald-500" :
                              item.confidence >= 50 ? "bg-amber-500" : "bg-red-500",
                            )}
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{item.confidence}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{item.gapguCount}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{item.eulguCount}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{item.charCount.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openReview(item.id)}
                          className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="리뷰"
                        >
                          <Eye size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Eye size={16} strokeWidth={1.5} className="text-primary" />
              리뷰: {reviewItem.sourceFileName}
              <Badge variant={STATUS_COLORS[reviewItem.status] as "neutral" | "info" | "success" | "danger"}>
                {STATUS_LABELS[reviewItem.status]}
              </Badge>
            </h3>
            <button onClick={() => setReviewItem(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 원문 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">원문 텍스트 (복호화)</label>
              <div className="h-80 overflow-auto rounded-lg border bg-gray-50 p-3 text-xs font-mono whitespace-pre-wrap">
                {reviewItem.rawText}
              </div>
            </div>

            {/* 파싱 결과 (편집 가능) */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">파싱 결과 (JSON 편집 가능)</label>
              <textarea
                value={editedParsedJson}
                onChange={(e) => setEditedParsedJson(e.target.value)}
                className="h-80 w-full rounded-lg border bg-white p-3 text-xs font-mono focus:border-primary focus:outline-none"
              />
            </div>
          </div>

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
      )}

      {/* ─── 도메인 용어 사전 섹션 ─── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen size={20} strokeWidth={1.5} className="text-primary" />
            도메인 용어 사전
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={handleSeedVocab}
              disabled={seedLoading}
              className="text-xs bg-amber-500 hover:bg-amber-600"
            >
              <Sprout size={14} strokeWidth={1.5} className="mr-1" />
              {seedLoading ? "시드 중..." : `초기 시드 (${vocabStats.total === 0 ? "권장" : "추가"})`}
            </Button>
            <Button
              onClick={handleExportVocab}
              disabled={vocabStats.total === 0}
              className="text-xs"
            >
              <Download size={14} strokeWidth={1.5} className="mr-1" />
              vocab.txt ({vocabStats.total})
            </Button>
          </div>
        </div>

        {/* 카테고리별 진행 바 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(Object.entries(VOCAB_CATEGORIES) as [VocabCategory, { label: string; target: number }][]).map(
            ([key, { label, target }]) => {
              const count = vocabStats[key] || 0;
              const pct = Math.min(100, Math.round((count / target) * 100));
              return (
                <div key={key} className="p-3 rounded-lg border border-border bg-surface">
                  <div className="text-xs text-muted mb-1">{label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{count}</span>
                    <span className="text-xs text-muted">/ {target}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-gray-300",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted mt-1 text-right">{pct}%</div>
                </div>
              );
            },
          )}
        </div>

        {/* 수동 추가 폼 */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-lg border border-dashed border-border">
          <input
            type="text"
            placeholder="용어 입력"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as VocabCategory)}
            className="px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none"
          >
            {(Object.entries(VOCAB_CATEGORIES) as [VocabCategory, { label: string; target: number }][]).map(
              ([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>
          <input
            type="text"
            placeholder="설명 (선택)"
            value={newDefinition}
            onChange={(e) => setNewDefinition(e.target.value)}
            className="flex-1 min-w-[150px] px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button onClick={handleAddVocab} disabled={!newTerm.trim()} className="text-xs">
            <Plus size={14} strokeWidth={1.5} className="mr-1" />
            추가
          </Button>
        </div>

        {/* 필터 + 검색 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "all", label: "전체" },
            ...Object.entries(VOCAB_CATEGORIES).map(([k, v]) => ({
              key: k,
              label: v.label.replace(" 용어", ""),
            })),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setVocabFilter(f.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                vocabFilter === f.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {f.label}
              {f.key === "all"
                ? ` (${vocabStats.total})`
                : ` (${vocabStats[f.key as keyof VocabStats] || 0})`}
            </button>
          ))}
          <input
            type="text"
            placeholder="검색..."
            value={vocabSearch}
            onChange={(e) => setVocabSearch(e.target.value)}
            className="ml-auto px-3 py-1 rounded-lg border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-40"
          />
        </div>

        {/* 용어 테이블 */}
        {vocabLoading ? (
          <p className="text-center text-muted py-8">불러오는 중...</p>
        ) : vocabItems.length === 0 ? (
          <p className="text-center text-muted py-8">
            등록된 용어가 없습니다. &quot;초기 시드&quot; 버튼을 눌러 기본 용어를 등록하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="pb-2 font-medium">용어</th>
                  <th className="pb-2 font-medium">카테고리</th>
                  <th className="pb-2 font-medium">출처</th>
                  <th className="pb-2 font-medium text-center">빈도</th>
                  <th className="pb-2 font-medium">설명</th>
                  <th className="pb-2 font-medium text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {vocabItems.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="py-2 font-medium">{v.term}</td>
                    <td className="py-2">
                      {editingVocab === v.id ? (
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as VocabCategory)}
                          className="px-2 py-0.5 rounded border border-border text-xs"
                        >
                          {(Object.entries(VOCAB_CATEGORIES) as [VocabCategory, { label: string; target: number }][]).map(
                            ([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ),
                          )}
                        </select>
                      ) : (
                        <Badge variant={CATEGORY_COLORS[v.category] as "info" | "warning" | "neutral" | "success" || "neutral"}>
                          {VOCAB_CATEGORIES[v.category as VocabCategory]?.label || v.category}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 text-xs text-muted">
                      {v.source === "auto_extracted" ? "자동" : "수동"}
                    </td>
                    <td className="py-2 text-center">{v.frequency}</td>
                    <td className="py-2 text-xs text-muted max-w-[200px] truncate">
                      {editingVocab === v.id ? (
                        <input
                          value={editDefinition}
                          onChange={(e) => setEditDefinition(e.target.value)}
                          className="w-full px-2 py-0.5 rounded border border-border text-xs"
                          placeholder="설명"
                        />
                      ) : (
                        v.definition || "-"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {editingVocab === v.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditVocab(v.id)} className="text-emerald-500 hover:text-emerald-700">
                            <Check size={14} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => setEditingVocab(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingVocab(v.id);
                              setEditCategory(v.category as VocabCategory);
                              setEditDefinition(v.definition || "");
                            }}
                            className="text-gray-400 hover:text-primary"
                          >
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => handleDeleteVocab(v.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
