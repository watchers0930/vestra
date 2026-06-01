"use client";

import { ArrowDown, Lock } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import type { SnapshotItem } from "../hooks/usePropertyDetail";

interface Props {
  snapshots: SnapshotItem[];
}

const SECTION_LABEL: Record<string, string> = {
  title: "표제부",
  exclusive: "전유부분",
  gapgu: "갑구",
  eulgu: "을구",
};

function truncHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}···${hash.slice(-8)}`;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 두 스냅샷 사이의 변동 섹션 감지
 */
function getChangedSections(
  prev: SnapshotItem,
  curr: SnapshotItem
): string[] {
  const prevMap = new Map(
    (prev.sectionHashes || []).map((s) => [s.section, s.hash])
  );
  return (curr.sectionHashes || [])
    .filter((s) => prevMap.get(s.section) !== s.hash)
    .map((s) => s.section);
}

export function SnapshotChainView({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader title="등기부 기록 이력" description="변동 감시 중 저장된 등기부 사본" className="px-5 pt-4" />
        <CardContent className="px-5 pb-5 pt-0">
          <p className="text-center text-[13px] text-[#86868b] py-8">
            기록된 스냅샷이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="등기부 기록 이력"
        description={`총 ${snapshots.length}건의 등기부 사본이 안전하게 보관됨`}
        className="px-5 pt-4"
      />
      <CardContent className="px-5 pb-5 pt-0">
        <div className="space-y-0">
          {snapshots.map((snap, idx) => {
            const changed = idx > 0 ? getChangedSections(snapshots[idx - 1], snap) : [];
            const isFirst = idx === 0;

            return (
              <div key={snap.id}>
                {/* 변동 화살표 (이전 → 현재 사이) */}
                {idx > 0 && (
                  <div className="flex items-center gap-2 py-2 pl-4">
                    <ArrowDown size={14} className="text-[#c7c7cc]" />
                    {changed.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#aeaeb2]">변동:</span>
                        {changed.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-[#fff3cd] text-[#856404] font-medium"
                          >
                            {SECTION_LABEL[s] || s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 스냅샷 카드 */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: isFirst ? "rgba(0,113,227,0.05)" : "#f9fafb",
                    border: isFirst
                      ? "1px solid rgba(0,113,227,0.15)"
                      : "1px solid #e5e5e7",
                  }}
                >
                  {/* 상단: 시퀀스 + 시간 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[12px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: isFirst ? "rgba(0,113,227,0.1)" : "rgba(0,0,0,0.05)",
                          color: isFirst ? "#0071e3" : "#6e6e73",
                        }}
                      >
                        #{snap.sequenceNo}
                      </span>
                      {isFirst && (
                        <span className="text-[11px] font-medium text-[#0071e3]">
                          최초 기록
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-[#86868b]">
                      {formatTimestamp(snap.timestamp)}
                    </span>
                  </div>

                  {/* 하단: 해시 + 섹션 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Lock size={12} className="text-[#aeaeb2] flex-shrink-0" />
                      <span className="text-[11px] text-[#aeaeb2] flex-shrink-0">디지털 지문</span>
                      <code
                        className="text-[11px] font-mono text-[#1d1d1f] bg-white/60 px-1.5 py-0.5 rounded truncate"
                        title={snap.snapshotHash}
                      >
                        {truncHash(snap.snapshotHash)}
                      </code>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      {(snap.sectionHashes || []).map((s) => (
                        <span
                          key={s.section}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-white/80 text-[#6e6e73] border border-[#e5e5e7]"
                        >
                          {SECTION_LABEL[s.section] || s.section}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
