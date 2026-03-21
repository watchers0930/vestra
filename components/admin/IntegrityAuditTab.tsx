"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Hash, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button } from "@/components/common";
import { KpiCard } from "@/components/results";

interface StepData {
  stepId: string;
  stepName: string;
  inputHash: string;
  outputHash: string;
  previousStepHash: string;
  stepHash: string;
  timestamp?: string;
}

interface AuditRecord {
  id: string;
  analysisId: string;
  analysisType: string;
  address: string | null;
  steps: number;
  stepsData: StepData[];
  merkleRoot: string;
  isValid: boolean;
  verifiedAt: string;
  createdAt: string;
}

interface AuditData {
  records: AuditRecord[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    avgSteps: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function IntegrityAuditTab() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditRecord | null>(null);

  const fetchData = useCallback(async (p: number = 1) => {
    try {
      const res = await fetch(`/api/admin/integrity-audit?page=${p}&limit=20`);
      if (!res.ok) throw new Error("데이터 로딩 실패");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const handleVerifyAll = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/integrity-audit", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "재검증 실패");
      } else {
        setError(null);
        await fetchData(page);
      }
    } catch {
      setError("재검증 실행 중 오류");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#6e6e73]" size={24} />
      </div>
    );
  }

  const stats = data?.stats || { total: 0, valid: 0, invalid: 0, avgSteps: 0 };
  const records = data?.records || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="전체 체인"
          value={stats.total.toLocaleString()}
          description="누적 기록"
          icon={Hash}
        />
        <KpiCard
          label="검증 통과"
          value={stats.valid.toLocaleString()}
          description={stats.total > 0 ? `${((stats.valid / stats.total) * 100).toFixed(1)}%` : "-"}
          icon={CheckCircle}
        />
        <KpiCard
          label="변조 감지"
          value={stats.invalid.toLocaleString()}
          description={stats.invalid > 0 ? "조치 필요" : "이상 없음"}
          icon={XCircle}
        />
        <KpiCard
          label="평균 단계"
          value={String(stats.avgSteps)}
          description="분석당 해시체인"
          icon={ShieldCheck}
        />
      </div>

      {/* 감사 로그 테이블 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldCheck size={16} />
            무결성 감사 로그
          </h3>
          <Button icon={RefreshCw} size="sm" variant="secondary" loading={verifying} onClick={handleVerifyAll}>
            전체 재검증
          </Button>
        </div>

        {records.length === 0 ? (
          <p className="text-sm text-[#6e6e73]">아직 무결성 기록이 없습니다. 분석을 실행하면 자동으로 기록됩니다.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">상태</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">분석 유형</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">주소</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">시간</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">단계</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Merkle Root</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((entry) => (
                    <tr key={entry.id} className={cn("border-b border-gray-100 hover:bg-gray-50 transition-colors", !entry.isValid && "bg-red-50/50")}>
                      <td className="py-2.5 px-3">
                        {entry.isValid ? (
                          <CheckCircle size={14} className="text-emerald-500" />
                        ) : (
                          <XCircle size={14} className="text-red-500" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-medium">{entry.analysisType}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500 max-w-[120px] truncate">
                        {entry.address || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3 text-xs">{entry.steps}단계</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] text-gray-400">
                          {entry.merkleRoot.slice(0, 16)}…
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-xs text-gray-500">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="text-xs px-3 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 상세 모달 */}
      {selectedEntry && (
        <Card className="p-6 border-2 border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Hash size={16} />
              체인 상세 정보
            </h3>
            <button onClick={() => setSelectedEntry(null)} className="text-xs text-gray-400 hover:text-gray-600">
              닫기 ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">Analysis ID</p>
              <p className="font-mono text-[10px] break-all">{selectedEntry.analysisId}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">분석 유형</p>
              <p className="font-medium">{selectedEntry.analysisType}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">생성 시간</p>
              <p>{new Date(selectedEntry.createdAt).toLocaleString("ko-KR")}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">검증 시간</p>
              <p>{new Date(selectedEntry.verifiedAt).toLocaleString("ko-KR")}</p>
            </div>
            {selectedEntry.address && (
              <div className="p-2 bg-gray-50 rounded col-span-2">
                <p className="text-gray-400 text-[10px]">주소</p>
                <p className="text-xs">{selectedEntry.address}</p>
              </div>
            )}
            <div className="p-2 bg-gray-50 rounded col-span-2">
              <p className="text-gray-400 text-[10px]">Merkle Root (SHA-256)</p>
              <p className="font-mono text-[10px] break-all mt-1">{selectedEntry.merkleRoot}</p>
            </div>
          </div>

          {/* 해시 체인 시각화 */}
          <div className="mt-4">
            <p className="text-[10px] font-medium text-gray-600 mb-2">해시 체인 ({selectedEntry.steps}단계)</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {(selectedEntry.stepsData || []).map((step, i) => (
                <div key={step.stepId || i} className="flex items-center gap-1 flex-shrink-0">
                  <div
                    className={cn(
                      "px-2 h-10 rounded-lg flex items-center justify-center text-[9px] font-mono",
                      selectedEntry.isValid
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    )}
                    title={`Hash: ${step.stepHash}`}
                  >
                    {step.stepName}
                  </div>
                  {i < (selectedEntry.stepsData?.length || 0) - 1 && (
                    <span className="text-gray-300 text-xs">→</span>
                  )}
                </div>
              ))}
              <span className="text-gray-300 text-xs mx-1">→</span>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/30 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                ROOT
              </div>
            </div>
          </div>

          <div className={cn(
            "mt-3 p-2 rounded-lg text-xs font-medium flex items-center gap-2",
            selectedEntry.isValid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}>
            {selectedEntry.isValid ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {selectedEntry.isValid ? "모든 해시 링크 검증 통과 — 변조 없음" : "해시 불일치 감지 — 변조 가능성 있음"}
          </div>
        </Card>
      )}
    </div>
  );
}
