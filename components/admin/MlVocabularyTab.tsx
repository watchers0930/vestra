"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Download,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Sprout,
} from "lucide-react";
import { VOCAB_CATEGORIES, type VocabCategory } from "@/lib/domain-vocabulary";
import { cn } from "@/lib/utils";
import { Card, Button, Badge } from "@/components/common";

// ─── Types ───

export interface VocabItem {
  id: string;
  term: string;
  category: string;
  source: string;
  frequency: number;
  definition: string | null;
}

export interface VocabStats {
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

// ─── Component ───

export function MlVocabularyTab() {
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [vocabStats, setVocabStats] = useState<VocabStats>({
    total: 0,
    registry_right: 0,
    legal_action: 0,
    structure: 0,
    finance_tax: 0,
  });
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

  // ─── 용어 CRUD ───

  const handleAddVocab = async () => {
    if (!newTerm.trim()) return;
    try {
      const res = await fetch("/api/admin/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: newTerm.trim(),
          category: newCategory,
          definition: newDefinition || undefined,
        }),
      });
      if (!res.ok) throw new Error("추가 실패");
      setNewTerm("");
      setNewDefinition("");
      fetchVocab();
    } catch {
      /* 무시 */
    }
  };

  const handleDeleteVocab = async (id: string) => {
    try {
      await fetch(`/api/admin/vocabulary/${id}`, { method: "DELETE" });
      fetchVocab();
    } catch {
      /* 무시 */
    }
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
    } catch {
      /* 무시 */
    }
  };

  const handleSeedVocab = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/admin/vocabulary/seed", { method: "POST" });
      if (!res.ok) throw new Error("시드 실패");
      fetchVocab();
    } catch {
      /* 무시 */
    } finally {
      setSeedLoading(false);
    }
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

  // ─── 렌더링 ───

  return (
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
            {seedLoading
              ? "시드 중..."
              : `초기 시드 (${vocabStats.total === 0 ? "권장" : "추가"})`}
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
        {(
          Object.entries(VOCAB_CATEGORIES) as [
            VocabCategory,
            { label: string; target: number },
          ][]
        ).map(([key, { label, target }]) => {
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
        })}
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
          {(
            Object.entries(VOCAB_CATEGORIES) as [
              VocabCategory,
              { label: string; target: number },
            ][]
          ).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
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
                        {(
                          Object.entries(VOCAB_CATEGORIES) as [
                            VocabCategory,
                            { label: string; target: number },
                          ][]
                        ).map(([key, { label }]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge
                        variant={
                          (CATEGORY_COLORS[v.category] as
                            | "info"
                            | "warning"
                            | "neutral"
                            | "success") || "neutral"
                        }
                      >
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
                        <button
                          onClick={() => handleEditVocab(v.id)}
                          className="text-emerald-500 hover:text-emerald-700"
                        >
                          <Check size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setEditingVocab(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
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
                        <button
                          onClick={() => handleDeleteVocab(v.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
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
  );
}
