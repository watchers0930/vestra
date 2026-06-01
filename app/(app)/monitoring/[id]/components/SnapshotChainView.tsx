"use client";

import { ArrowRight } from "lucide-react";
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
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    month: "short",
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
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start gap-2 min-w-max">
            {snapshots.map((snap, idx) => {
              const changed = idx > 0 ? getChangedSections(snapshots[idx - 1], snap) : [];

              return (
                <div key={snap.id} className="flex items-start gap-2">
                  {/* 변동 표시 (이전 → 현재 사이) */}
                  {idx > 0 && (
                    <div className="flex flex-col items-center justify-center pt-6 gap-1">
                      <ArrowRight size={16} className="text-[#c7c7cc]" />
                      {changed.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 max-w-[60px] justify-center">
                          {changed.map((s) => (
                            <span
                              key={s}
                              className="text-[8px] px-1 py-0.5 rounded bg-[#fff3cd] text-[#856404] font-medium whitespace-nowrap"
                            >
                              {SECTION_LABEL[s] || s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 스냅샷 블록 */}
                  <div
                    className="w-[140px] rounded-xl p-3 flex-shrink-0"
                    style={{
                      background: idx === 0 ? "rgba(0,113,227,0.06)" : "#f9fafb",
                      border: idx === 0
                        ? "1px solid rgba(0,113,227,0.15)"
                        : "1px solid #e5e5e7",
                    }}
                  >
                    {/* 시퀀스 번호 */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: idx === 0 ? "rgba(0,113,227,0.1)" : "rgba(0,0,0,0.05)",
                          color: idx === 0 ? "#0071e3" : "#6e6e73",
                        }}
                      >
                        #{snap.sequenceNo}
                      </span>
                      {idx === 0 && (
                        <span className="text-[8px] font-medium text-[#0071e3]">
                          최초 기록
                        </span>
                      )}
                    </div>

                    {/* 시간 */}
                    <div className="text-[10px] text-[#86868b] mb-2">
                      {formatTimestamp(snap.timestamp)}
                    </div>

                    {/* 해시 */}
                    <div className="space-y-1">
                      <div className="text-[9px] text-[#aeaeb2]">디지털 지문</div>
                      <div
                        className="text-[10px] font-mono text-[#1d1d1f] bg-white/60 px-1.5 py-1 rounded truncate"
                        title={snap.snapshotHash}
                      >
                        {truncHash(snap.snapshotHash)}
                      </div>
                    </div>

                    {/* 섹션 배지 */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(snap.sectionHashes || []).map((s) => (
                        <span
                          key={s.section}
                          className="text-[8px] px-1 py-0.5 rounded bg-[#f5f5f7] text-[#6e6e73]"
                        >
                          {SECTION_LABEL[s.section] || s.section}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
