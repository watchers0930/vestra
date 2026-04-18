"use client";

import { useState, useEffect, useCallback } from "react";
import { MlTrainingDataTab, type StatusFilter, type Stats, type TrainingDataItem } from "./MlTrainingDataTab";
import { MlVocabularyTab } from "./MlVocabularyTab";

// ─── Component ───

export function MlTrainingTab() {
  // 목록 상태
  const [items, setItems] = useState<TrainingDataItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    reviewed: 0,
    approved: 0,
    rejected: 0,
    avgConfidence: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

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

  // ─── 상태 필터 변경 ───

  const handleStatusFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  }, []);

  // ─── 일괄 승인 ───

  const bulkApprove = useCallback(async () => {
    if (
      !confirm(
        `대기/검토 중인 ${stats.pending + stats.reviewed}건을 모두 승인하시겠습니까?`,
      )
    )
      return;
    setBulkApproving(true);
    try {
      const res = await fetch("/api/admin/training-data/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minConfidence: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchData();
    } catch {
      // 조용히 실패
    } finally {
      setBulkApproving(false);
    }
  }, [stats.pending, stats.reviewed, fetchData]);

  // ─── JSONL 내보내기 ───

  const exportJSONL = useCallback(async () => {
    const res = await fetch("/api/admin/training-data/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vestra-training-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ─── 삭제 ───

  const deleteItem = useCallback(
    async (id: string) => {
      if (!confirm("정말 삭제하시겠습니까?")) return;
      await fetch(`/api/admin/training-data/${id}`, { method: "DELETE" });
      fetchData();
    },
    [fetchData],
  );

  // ─── 렌더링 ───

  return (
    <div className="space-y-6">
      <MlTrainingDataTab
        items={items}
        stats={stats}
        page={page}
        totalPages={totalPages}
        statusFilter={statusFilter}
        loading={loading}
        bulkApproving={bulkApproving}
        onStatusFilterChange={handleStatusFilterChange}
        onPageChange={setPage}
        onBulkApprove={bulkApprove}
        onExportJSONL={exportJSONL}
        onDeleteItem={deleteItem}
        onRefresh={fetchData}
      />
      <MlVocabularyTab />
    </div>
  );
}
