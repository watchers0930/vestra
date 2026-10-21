"use client";

import { Lock } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import type { SnapshotItem } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";
import { SECTION_LABEL, truncHash } from "./alertHelpers";

interface Props {
  snapshots: SnapshotItem[];
}

export default function SnapshotChainCard({ snapshots }: Props) {
  // 스냅샷 최신순 정렬
  const sortedSnaps = [...snapshots].sort((a, b) => b.sequenceNo - a.sequenceNo);
  const minSeq = sortedSnaps.length ? sortedSnaps[sortedSnaps.length - 1].sequenceNo : 0;

  return (
    <div className={s.detCard}>
      <div className={s.detEyebrow}>Registry Snapshot</div>
      <div className={s.detTitle}>등기부 기록 이력</div>
      <div className={s.detSub}>변동 감시 중 저장된 등기부 사본</div>
      {sortedSnaps.length > 0 ? (
        <>
          <div className={`${s.detCountBadge} ${s.dcbGreen}`}>
            <Lock size={13} /> 총 {sortedSnaps.length}건의 등기부 사본이 안전하게 보관됨
          </div>
          <div className={s.snapChain}>
            {sortedSnaps.map((snap, idx) => {
              const older = sortedSnaps[idx + 1];
              const isFirst = snap.sequenceNo === minSeq;
              const isLatest = idx === 0;
              const changed = older
                ? (snap.sectionHashes || [])
                    .filter((sec) => (older.sectionHashes || []).find((o) => o.section === sec.section)?.hash !== sec.hash)
                    .map((sec) => SECTION_LABEL[sec.section] || sec.section)
                : [];
              return (
                <div key={snap.id}>
                  <div className={s.snapItem}>
                    <div className={s.snapNum} style={isFirst ? { background: "#1a1d2e" } : undefined}>{snap.sequenceNo}</div>
                    <div className={s.snapCard}>
                      <div className={s.snapHead}>
                        <span className={s.snapSeq}>#{snap.sequenceNo}{isLatest ? " 최신" : ""}</span>
                        {isFirst && <span className={s.snapFirst}>최초 기록</span>}
                        <span className={s.snapT}>{new Date(snap.timestamp).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className={s.snapHash}>
                        <span className={s.snapHashIco}><Lock size={13} /></span>
                        <div>
                          <div className={s.snapHashL}>디지털 지문</div>
                          <div className={s.snapHashV}>{truncHash(snap.snapshotHash)}</div>
                        </div>
                      </div>
                      <div className={s.snapSecs}>
                        {(snap.sectionHashes || []).map((sec) => (
                          <span key={sec.section} className={s.snapSec}>{SECTION_LABEL[sec.section] || sec.section}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {older && changed.length > 0 && (
                    <div className={s.snapDiff}>⬇ 변동 감지: [{changed.join(", ")}]</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#999", fontSize: "13px" }}>
          기록된 스냅샷이 없습니다.
        </div>
      )}
    </div>
  );
}
