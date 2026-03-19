"use client";

import { useState } from "react";
import { ShieldCheck, Hash, CheckCircle, XCircle, Clock, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button, Badge } from "@/components/common";
import { KpiCard } from "@/components/results";

/**
 * 관리자 - 무결성 감사 로그 탭
 * integrity-chain의 감사 이력을 표시
 */

interface AuditEntry {
  chainId: string;
  analysisType: string;
  timestamp: string;
  steps: number;
  merkleRoot: string;
  isValid: boolean;
  verifiedAt: string;
}

// 시뮬레이션 데이터
const MOCK_AUDIT_LOG: AuditEntry[] = Array.from({ length: 20 }, (_, i) => {
  const types = ["권리분석", "계약검토", "시세전망", "전세분석", "사기탐지"];
  const date = new Date(Date.now() - i * 3600000 * (1 + Math.random() * 5));
  const chars = "0123456789abcdef";
  let hash = "";
  for (let j = 0; j < 64; j++) hash += chars[((i + 7) * (j + 13) + j * 31) % 16];

  return {
    chainId: `chain_${date.getTime()}_${Math.random().toString(36).slice(2, 6)}`,
    analysisType: types[i % types.length],
    timestamp: date.toISOString(),
    steps: 4 + Math.floor(Math.random() * 3),
    merkleRoot: hash,
    isValid: Math.random() > 0.05, // 95% 유효
    verifiedAt: new Date(date.getTime() + 1000).toISOString(),
  };
});

export function IntegrityAuditTab() {
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [verifying, setVerifying] = useState(false);

  const validCount = MOCK_AUDIT_LOG.filter(e => e.isValid).length;
  const invalidCount = MOCK_AUDIT_LOG.filter(e => !e.isValid).length;

  const handleVerifyAll = () => {
    setVerifying(true);
    setTimeout(() => setVerifying(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="전체 체인" value={String(MOCK_AUDIT_LOG.length)} description="최근 24시간" icon={Hash} />
        <KpiCard label="검증 통과" value={String(validCount)} description={`${((validCount / MOCK_AUDIT_LOG.length) * 100).toFixed(1)}%`} icon={CheckCircle} />
        <KpiCard label="변조 감지" value={String(invalidCount)} description={invalidCount > 0 ? "조치 필요" : "이상 없음"} icon={XCircle} />
        <KpiCard label="평균 단계" value={(MOCK_AUDIT_LOG.reduce((s, e) => s + e.steps, 0) / MOCK_AUDIT_LOG.length).toFixed(1)} description="분석당 해시체인" icon={ShieldCheck} />
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">상태</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">분석 유형</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">시간</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">단계</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Merkle Root</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT_LOG.map((entry) => (
                <tr key={entry.chainId} className={cn("border-b border-gray-100 hover:bg-gray-50 transition-colors", !entry.isValid && "bg-red-50/50")}>
                  <td className="py-2.5 px-3">
                    {entry.isValid ? (
                      <CheckCircle size={14} className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-medium">{entry.analysisType}</td>
                  <td className="py-2.5 px-3 text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
              <p className="text-gray-400 text-[10px]">Chain ID</p>
              <p className="font-mono text-[10px] break-all">{selectedEntry.chainId}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">분석 유형</p>
              <p className="font-medium">{selectedEntry.analysisType}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">생성 시간</p>
              <p>{new Date(selectedEntry.timestamp).toLocaleString("ko-KR")}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="text-gray-400 text-[10px]">검증 시간</p>
              <p>{new Date(selectedEntry.verifiedAt).toLocaleString("ko-KR")}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded col-span-2">
              <p className="text-gray-400 text-[10px]">Merkle Root (SHA-256)</p>
              <p className="font-mono text-[10px] break-all mt-1">{selectedEntry.merkleRoot}</p>
            </div>
          </div>

          {/* 해시 체인 시각화 */}
          <div className="mt-4">
            <p className="text-[10px] font-medium text-gray-600 mb-2">해시 체인 ({selectedEntry.steps}단계)</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {Array.from({ length: selectedEntry.steps }).map((_, i) => (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-mono",
                    selectedEntry.isValid ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-red-100 text-red-700 border border-red-300"
                  )}>
                    S{i + 1}
                  </div>
                  {i < selectedEntry.steps - 1 && (
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
