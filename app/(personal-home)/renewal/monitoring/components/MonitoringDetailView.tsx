"use client";

import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, Bell, Folder, ShieldCheck, Loader2, FileText, Wallet } from "lucide-react";
import s from "../monitoring-renewal.module.css";
import { useToast } from "@/components/common/toast";
import { addOrUpdateAsset, getAssets } from "@/lib/store";
import { analyzeAndSaveMonitoredAsset } from "@/lib/monitor-asset-register";
import { usePropertyDetail } from "@/app/(app)/monitoring/[id]/hooks/usePropertyDetail";
import MonitoringActivityCalendar from "./MonitoringActivityCalendar";
import AlertTimelineCard from "./AlertTimelineCard";
import SnapshotChainCard from "./SnapshotChainCard";
import IntegrityCard from "./IntegrityCard";
import { formatDateShort } from "./alertHelpers";

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

  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [addingAsset, setAddingAsset] = useState(false);
  const [assetAdded, setAssetAdded] = useState(false);

  // 이미 내 자산에 있는 물건인지 (주소 매칭)
  useEffect(() => {
    if (property) setAssetAdded(getAssets().some((a) => a.address === property.address));
  }, [property]);

  async function handleAddAsset() {
    if (!property || addingAsset) return;
    setAddingAsset(true);
    try {
      const res = await fetch(`/api/monitoring/${propertyId}/to-asset`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.asset) {
        addOrUpdateAsset(data.asset);
        setAssetAdded(true);
        showToast("내 자산에 추가됐습니다 — 대시보드에 반영됩니다.", "success");
      } else if (res.ok && data.analyzed === false) {
        // 등기 원문 없음 → 주소 기반 시세만 반영
        const r = await analyzeAndSaveMonitoredAsset({ address: property.address });
        if (r.ok) {
          setAssetAdded(true);
          showToast("시세를 자산에 반영했습니다(안전도는 등기부 PDF 등록 시 분석).", "success");
        } else {
          showToast("자산 추가에 실패했습니다.", "error");
        }
      } else {
        showToast(data.error || "자산 추가에 실패했습니다.", "error");
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setAddingAsset(false);
    }
  }

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
  const checkLogs = property.checkLogs || [];

  return (
    <div className={s.pageWrap}>
      {/* Back + Actions */}
      <div className={s.detailTop}>
        <div className={s.detailBack} onClick={onBack}>‹ 목록으로</div>
        <div className={s.detailActions}>
          {assetAdded ? (
            <span className={s.dBtnAssetOn}><Wallet size={13} /> 자산에 포함됨</span>
          ) : (
            <button className={s.dBtnAsset} onClick={handleAddAsset} disabled={addingAsset}>
              {addingAsset ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />}
              내 자산으로 추가
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
          <a
            className={s.dBtnIssue}
            href="https://www.iros.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            title="인터넷등기소 접속 후: 열람·발급 → 부동산 → 주소 입력 → 발급(제출용)/열람(확인용) 선택"
          >
            <FileText size={13} /> 등기부등본 발급
          </a>
        </div>
      </div>

      {/* 발급 안내 (이용자 직접 발급) */}
      <p style={{ fontSize: 12, color: "#8a8a8f", margin: "0 0 12px", lineHeight: 1.5 }}>
        ※ 등기부등본은 인터넷등기소에서 직접 발급합니다: 열람·발급 → 부동산 → 주소 입력 → 발급(제출용)/열람(확인용) 선택
      </p>

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
          <div className={s.pis}><ShieldCheck size={13} /> <span className={s.pisN} style={{ color: "#2e4bd8" }}>보호중</span></div>
          <div className={s.pisDelWrap}>
            {confirmDelete ? (
              <>
                <span style={{ fontSize: "12px", color: "#888" }}>삭제할까요?</span>
                <button className={s.pisDelCancel} onClick={() => setConfirmDelete(false)}>취소</button>
                <button className={s.pisDel} onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} 삭제
                </button>
              </>
            ) : (
              <button className={s.pisDel} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={12} /> 삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Timeline */}
      <AlertTimelineCard
        alerts={property.alerts}
        unreadCount={unreadCount}
        deposit={property.deposit}
        onMarkRead={markAlertRead}
      />

      {/* Check Log Timeline */}
      <div className={s.detCard}>
        <div className={s.detEyebrow}>Monitoring Activity</div>
        <div className={s.detTitle}>감시 실행 내역</div>
        <div className={s.detSub}>하루 2회 등기 상태를 자동 점검한 기록입니다</div>
        {checkLogs.length > 0 ? (
          <MonitoringActivityCalendar logs={checkLogs} />
        ) : (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#999", fontSize: "13px" }}>
            아직 감시 실행 기록이 없습니다. 다음 정기 점검(하루 2회) 후 표시됩니다.
          </div>
        )}
      </div>

      {/* Snapshot Chain */}
      <SnapshotChainCard snapshots={snapshots} />

      {/* Integrity Verification */}
      <IntegrityCard
        isUnverified={isUnverified}
        integrityResult={integrityResult}
        verifying={verifying}
        snapshotCount={snapshots.length}
        onVerify={verifyIntegrity}
      />
    </div>
  );
}
