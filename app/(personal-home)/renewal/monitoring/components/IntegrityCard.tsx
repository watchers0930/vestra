"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import type { IntegrityResult } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";

interface Props {
  isUnverified: boolean;
  integrityResult: IntegrityResult | null;
  verifying: boolean;
  snapshotCount: number;
  onVerify: () => void;
}

export default function IntegrityCard({ isUnverified, integrityResult, verifying, snapshotCount, onVerify }: Props) {
  const [showPubkey, setShowPubkey] = useState(false);

  return (
    <div className={s.detCard}>
      <div className={s.detEyebrow}>Integrity Verification</div>
      <div className={s.detTitle}>위변조 검사</div>
      <div className={s.detSub} style={{ marginBottom: "16px" }}>블록체인 암호화 기반으로 기록 변조 여부를 검증합니다</div>

      {isUnverified && (
        <div className={s.integWarn}>
          <span className={s.integWarnIco}><AlertTriangle size={18} /></span>
          <div>
            <div className={s.integWarnT}>원본 진위 미검증 물건</div>
            <div className={s.integWarnD}>이 물건은 공식 등기 연계 없이 PDF로 직접 등록되었습니다. Vestra 내부 기록의 변조만 검증하며, 최초 PDF 원본 진위는 인터넷등기소에서 직접 확인하세요.</div>
            <a className={s.integWarnLnk} href="https://www.iros.go.kr" target="_blank" rel="noopener noreferrer">인터넷등기소에서 직접 발급·확인하기 →</a>
          </div>
        </div>
      )}

      <div className={s.integNote}>이 검사는 Vestra가 저장한 등기부 기록이 이후 변조되지 않았는지만 확인합니다. 등기부 원본 진위 자체는 인터넷등기소에서 직접 확인하세요.</div>

      <button className={s.integBtn} onClick={onVerify} disabled={verifying}>
        {verifying ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        )}
        {verifying ? "검증 중..." : "검증 실행"}
      </button>

      {integrityResult && !verifying && (
        <div className={s.integResult}>
          <div className={s.integResultRow}>
            <span className={s.integResultIco}>
              {integrityResult.isValid ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </span>
            <span className={s.integResultL}>{integrityResult.isValid ? "위변조 없음 확인" : "위변조 의심 — 확인 필요"}</span>
          </div>
          <div className={s.integResultS}>
            전체 {integrityResult.totalSnapshots ?? snapshotCount}건의 기록을 검사했습니다
            {integrityResult.isValid ? " · 모든 스냅샷이 무결합니다" : integrityResult.brokenAt != null ? ` · ${integrityResult.brokenAt}번째 기록에서 이상 감지` : ""}
          </div>
          <div className={s.integChecks}>
            <div className={s.integCheck}>
              <div className={s.integCheckIco}><CheckCircle2 size={16} /></div>
              <div className={s.integCheckT}>해시 체인 검증{integrityResult.hashChainValid ? "" : " ✕"}</div>
              <div className={s.integCheckS}>블록체인 연결 무결성</div>
            </div>
            <div className={s.integCheck}>
              <div className={s.integCheckIco}><CheckCircle2 size={16} /></div>
              <div className={s.integCheckT}>전자 서명 확인{integrityResult.signaturesValid ? "" : " ✕"}</div>
              <div className={s.integCheckS}>Ed25519 디지털 서명</div>
            </div>
            <div className={s.integCheck}>
              <div className={s.integCheckIco}><CheckCircle2 size={16} /></div>
              <div className={s.integCheckT}>내용 일치 확인{integrityResult.merkleRootsValid ? "" : " ✕"}</div>
              <div className={s.integCheckS}>Merkle Tree 검증</div>
            </div>
          </div>
          {integrityResult.publicKey && (
            <>
              <button className={s.integPubkeyBtn} onClick={() => setShowPubkey((v) => !v)}>
                {showPubkey ? "검증용 공개키 접기 ▴" : "검증용 공개키 보기 ▾"}
              </button>
              {showPubkey && <div className={s.integPubkeyBox}>{integrityResult.publicKey}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
