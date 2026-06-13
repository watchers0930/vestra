"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileDown, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { usePropertyDetail } from "./hooks/usePropertyDetail";
import { PropertyInfoHeader } from "./components/PropertyInfoHeader";
import { AlertTimeline } from "./components/AlertTimeline";
import { SnapshotChainView } from "./components/SnapshotChainView";
import { IntegrityVerification } from "./components/IntegrityVerification";

interface Props {
  params: Promise<{ id: string }>;
}

export default function MonitoringDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
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
  } = usePropertyDetail(id);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const ok = await deleteProperty();
    setDeleting(false);
    if (ok) router.push("/monitoring");
  };

  const handleExportPdf = async () => {
    if (!property) return;
    setPdfLoading(true);
    try {
      const { exportMonitoringCertificatePdf } = await import(
        "@/lib/monitoring-certificate-pdf"
      );
      await exportMonitoringCertificatePdf({
        property,
        snapshots,
        integrityResult,
      });
    } catch (error) {
      console.error("PDF 내보내기 실패:", error);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="text-center py-16">
          <p className="text-[15px] text-[#6e6e73] mb-4">물건을 찾을 수 없습니다.</p>
          <Link href="/monitoring" className="text-[13px] text-[#0071e3] hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/monitoring"
          className="flex items-center gap-1.5 text-[13px] text-[#6e6e73] hover:text-[#0071e3] transition-colors"
        >
          <ArrowLeft size={15} />
          <span>목록으로</span>
        </Link>

        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-[12px] text-[#6e6e73]">삭제할까요?</span>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-[12px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting && <Loader2 size={12} className="animate-spin" />}
                삭제
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-[12px] text-[#86868b] hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
              삭제
            </button>
          )}
          <Button
            variant="secondary"
            icon={pdfLoading ? Loader2 : FileDown}
            size="sm"
            onClick={handleExportPdf}
            loading={pdfLoading}
          >
            증명서 PDF
          </Button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="space-y-6">
        <PropertyInfoHeader property={property} monitorDays={monitorDays} />
        <AlertTimeline alerts={property.alerts} deposit={property.deposit} property={property} onMarkRead={markAlertRead} />
        <SnapshotChainView snapshots={snapshots} />
        <IntegrityVerification
          result={integrityResult}
          verifying={verifying}
          onVerify={verifyIntegrity}
        />
      </div>
    </div>
  );
}
