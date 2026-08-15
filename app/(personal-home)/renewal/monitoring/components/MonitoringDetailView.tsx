"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Bell, Folder, ShieldCheck, Sparkles, Lock, CheckCircle2, Loader2 } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import { usePropertyDetail } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";
import {
  CHANGE_TYPE_LABEL,
  RISK_LABEL,
  RISK_ICO_SUFFIX,
  RISK_BADGE_SUFFIX,
  changeTypeIcon,
  getRiskExplanation,
  formatRelativeTime,
  formatDateShort,
  SECTION_LABEL,
  truncHash,
} from "./alertHelpers";

interface Props {
  propertyId: string;
  onBack: () => void;
}

const MODE_LABEL: Record<string, string> = {
  standard: "일반 감시",
  contract_gap: "계약갭 강화감시",
};

function formatDeposit(man: number | null): string | null {
  if (!man) return null;
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok > 0) return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

export default function MonitoringDetailView({ propertyId, onBack }: Props) {
  const {
    property,
    snapshots,
    monitorDays,
    loading,
    integrityResult,
    verifying,
    verifyIntegrity,
    markAlertRead,
    deleteProperty,
  } = usePropertyDetail(propertyId);

  const [showPubkey, setShowPubkey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const ok = await deleteProperty();
    setDeleting(false);
    if (ok) onBack();
  }

  async function handleExportPdf() {
    if (!property) return;
    setPdfLoading(true);
    try {
      const { exportMonitoringCertificatePdf } = await import("@/lib/monitoring-certificate-pdf");
      await exportMonitoringCertificatePdf({ property, snapshots, integrityResult });
    } catch (e) {
      console.error("PDF 내보내기 실패:", e);
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={s.pageWrap}>
        <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
          <Loader2 size={22} className="animate-spin" style={{ display: "inline-block" }} />
          <p style={{ marginTop: "12px", fontSize: "14px" }}>물건 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className={s.pageWrap}>
        <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
          <p style={{ fontSize: "15px", marginBottom: "16px" }}>물건을 찾을 수 없습니다.</p>
          <button className={s.detailBack} onClick={onBack}>‹ 목록으로</button>
        </div>
      </div>
    );
  }

  const isActive = property.status === "active";
  const unreadCount = property.alerts.filter((a) => !a.isRead).length;
  const depositLabel = formatDeposit(property.deposit);
  const isUnverified = !property.commUniqueNo;

  // 스냅샷 최신순 정렬
  const sortedSnaps = [...snapshots].sort((a, b) => b.sequenceNo - a.sequenceNo);
  const minSeq = sortedSnaps.length ? sortedSnaps[sortedSnaps.length - 1].sequenceNo : 0;

  return (
    <div className={s.pageWrap}>
      {/* Back + Actions */}
      <div className={s.detailTop}>
        <div className={s.detailBack} onClick={onBack}>‹ 목록으로</div>
        <div className={s.detailActions}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: "12px", color: "#888", alignSelf: "center" }}>삭제할까요?</span>
              <button className={s.dBtnDel} onClick={() => setConfirmDelete(false)} style={{ opacity: 0.7 }}>취소</button>
              <button className={s.dBtnDel} onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} 삭제
              </button>
            </>
          ) : (
            <button className={s.dBtnDel} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> 삭제
            </button>
          )}
          <button className={s.dBtnPdf} onClick={handleExportPdf} disabled={pdfLoading}>
            {pdfLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            증명서 PDF
          </button>
        </div>
      </div>

      {/* Property Info Card */}
      <div className={s.propInfoCard}>
        <div className={s.picTop}>
          <div>
            <div className={s.picAddr}>{property.address}</div>
            <div className={s.picBadges}>
              <span className={`${s.picB} ${isActive ? s.picbActive : s.picbPaused}`}>
                {isActive ? "감시중" : "일시중지"}
              </span>
              <span className={`${s.picB} ${s.picbMode}`}>{MODE_LABEL[property.monitorMode] || property.monitorMode}</span>
              {isUnverified && (
                <span className={`${s.picB} ${s.picbUnverified}`}><AlertTriangle size={12} /> 원본 미검증</span>
              )}
            </div>
          </div>
          <div className={s.picDays}>
            <div className={s.picDaysN}>{monitorDays}</div>
            <div className={s.picDaysL}>감시 일수</div>
          </div>
        </div>
        <div className={s.picMeta}>
          <div>
            <div className={s.pimLabel}>보증금</div>
            <div className={s.pimVal}>{depositLabel || "-"}</div>
          </div>
          <div>
            <div className={s.pimLabel}>계약일</div>
            <div className={s.pimVal}>{formatDateShort(property.contractDate)}</div>
          </div>
          <div>
            <div className={s.pimLabel}>전입 예정</div>
            <div className={s.pimVal}>{formatDateShort(property.moveInDate)}</div>
          </div>
        </div>
        <div className={s.picStats}>
          <div className={s.pis}><Folder size={13} /> 스냅샷 <span className={s.pisN}>{property.snapshotCount}건</span></div>
          <div className={s.pis}><Bell size={13} /> 미확인 알림 <span className={s.pisN} style={{ color: unreadCount > 0 ? "#ef4444" : undefined }}>{unreadCount}건</span></div>
          <div className={s.pis}><ShieldCheck size={13} /> <span className={s.pisN} style={{ color: "#22c55e" }}>보호중</span></div>
        </div>
      </div>

      {/* Alert Timeline */}
      <div className={s.detCard}>
        <div className={s.detEyebrow}>Alert Timeline</div>
        <div className={s.detTitle}>변동 알림</div>
        <div className={s.detSub}>감시 기간 중 감지된 등기 변동 이력</div>
        {property.alerts.length > 0 ? (
          <>
            <div className={`${s.detCountBadge} ${unreadCount > 0 ? s.dcbAmber : s.dcbGreen}`}>
              <Bell size={13} /> 총 {property.alerts.length}건의 변동 감지
            </div>
            {property.alerts.map((alert) => {
              const Icon = changeTypeIcon(alert.changeType);
              const explanation = getRiskExplanation(alert.changeType, alert.riskLevel, alert.summary, property.deposit);
              const hasBody = !!explanation || !!alert.detail || !alert.isRead;
              return (
                <div className={s.alertItem} key={alert.id}>
                  <div className={s.aiHead}>
                    <div className={`${s.aiIco} ${s[RISK_ICO_SUFFIX[alert.riskLevel]] || s.aiIcoMedium}`}>
                      <Icon size={15} />
                    </div>
                    <div className={s.aiInfo}>
                      <div className={s.aiType}>{CHANGE_TYPE_LABEL[alert.changeType] || alert.changeType}</div>
                      <div className={s.aiSumm}>{alert.summary}</div>
                    </div>
                    <div className={s.aiMeta}>
                      <span className={`${s.aiRisk} ${s[RISK_BADGE_SUFFIX[alert.riskLevel]] || s.airMedium}`}>
                        {RISK_LABEL[alert.riskLevel] || alert.riskLevel}
                      </span>
                      <span className={s.aiTime}>{formatRelativeTime(alert.createdAt)}</span>
                    </div>
                    {!alert.isRead && <div className={s.aiUnread}></div>}
                  </div>
                  {hasBody && (
                    <div className={s.aiBody}>
                      {alert.detail && <div className={s.aiDetail}>{alert.detail}</div>}
                      {explanation && (
                        <div className={s.aiWhy}>
                          <span className={s.aiWhyIco}><Sparkles size={13} /></span>
                          <div className={s.aiWhyTxt}>{explanation}</div>
                        </div>
                      )}
                      {!alert.isRead && (
                        <div className={s.aiBtns}>
                          <button className={s.aiRead} onClick={() => markAlertRead(alert.id)}>읽음 처리</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#999", fontSize: "13px" }}>
            감지된 변동 사항이 없습니다.
          </div>
        )}
      </div>

      {/* Snapshot Chain */}
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

      {/* Integrity Verification */}
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

        <button className={s.integBtn} onClick={verifyIntegrity} disabled={verifying}>
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
              전체 {integrityResult.totalSnapshots ?? sortedSnaps.length}건의 기록을 검사했습니다
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
    </div>
  );
}
