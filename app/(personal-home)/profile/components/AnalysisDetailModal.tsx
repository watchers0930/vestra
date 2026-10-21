"use client";

/**
 * AnalysisDetailModal — 분석 이력 상세·비교 모달 (설계 §4.3 ③)
 *
 * - 제목 연결(aria-labelledby)·포커스 이동/복귀/가두기·Escape 닫기·본문 스크롤
 * - 저장 스냅샷 상세 + 직전 이력 비교(AnalysisCompareReport) 표시
 * - PDF는 상세 데이터 확보 전 비활성, 전용 리포트 DOM을 캡처
 * - 로딩/실패/이전 결과 없음 상태를 각각 안내
 */
import { useEffect, useId, useRef } from "react";
import { X, Trash2, Loader2, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/common/Button";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { AnalysisCompareReport } from "./AnalysisCompareReport";
import type { AnalysisDetailResponse } from "../hooks/useAnalysisDetail";

/** 파일명 제어문자·경로문자 제거 (설계 §4.3) */
function safeFilename(s: string): string {
  return (s || "분석")
    .replace(/[\x00-\x1f/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "분석";
}

interface Props {
  record: { id: string; type: string; typeLabel: string; address: string; summary: string; date?: string };
  detail: AnalysisDetailResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}

/**
 * 비교 리포트(권리 안전점수·전세가율 중심)가 의미 있는지 판정.
 * 계약·시세·사업성 등은 해당 수치가 없어 "비교 불가" 목록 대신 저장 요약을 보여준다(설계 §4.3·F09).
 */
function supportsComparison(detail: AnalysisDetailResponse | null): boolean {
  if (!detail) return false;
  const m = detail.current.metrics;
  return m.safetyScore !== null || m.jeonseRatio !== null || m.vScore !== null || m.ratioToMarket !== null;
}

export function AnalysisDetailModal({ record, detail, loading, error, onClose, onDelete, deleting }: Props) {
  const titleId = useId();
  const reportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // 포커스 복귀: 열 때의 활성 요소 기억 → 닫을 때 복귀
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => { openerRef.current?.focus?.(); };
  }, []);

  // Escape 닫기 + 포커스 가두기(Tab 순환)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const dateStr = record.date
    ? new Date(record.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const pdfName = `vestra-분석비교-${safeFilename(record.address)}.pdf`;
  const comparable = supportsComparison(detail);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <span id={titleId} className="text-[15px] font-semibold text-[#1d1d1f]">{record.typeLabel} 상세·비교</span>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-1.5 text-[#86868b] transition-colors hover:bg-[#f5f5f7]"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-2.5 rounded-xl bg-[#f5f5f7] px-4 py-3">
            <MapPin size={14} className="mt-0.5 shrink-0 text-[#86868b]" />
            <span className="break-words text-[13px] text-[#1d1d1f]">{record.address || "주소 정보 없음"}</span>
          </div>
          {dateStr && (
            <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
              <Calendar size={13} />
              {dateStr} 분석
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              저장된 상세 결과를 불러오는 중...
            </div>
          )}

          {!loading && error && (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {error}
              </div>
              {/* 서버 상세 조회가 실패해도, 로컬에 저장된 요약은 계속 볼 수 있게 한다(회귀 방지). */}
              {record.summary && (
                <div className="rounded-xl border border-gray-100 bg-[#fafafa] p-4">
                  <p className="mb-1.5 text-[12px] font-semibold text-[#86868b]">저장된 분석 요약</p>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#1d1d1f]">
                    {record.summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && !error && detail && comparable && (
            <AnalysisCompareReport detail={detail} />
          )}

          {!loading && !error && detail && !comparable && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-100 bg-[#fafafa] p-4">
                <p className="mb-1.5 text-[12px] font-semibold text-[#86868b]">저장된 분석 요약</p>
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#1d1d1f]">
                  {record.summary || "저장된 요약이 없습니다."}
                </p>
              </div>
              <p className="text-[12px] leading-relaxed text-[#86868b]">
                이 분석 종류({record.typeLabel})는 안전점수·전세가율 중심의 수치 비교를 제공하지 않습니다.
                저장 시점의 요약만 표시하며, 요약에서 수치를 추정하지 않습니다.
              </p>
            </div>
          )}
        </div>

        {/* PDF 캡처 전용 클론 — 조상 overflow(본문 스크롤) 밖 고정 640px에서 렌더해 클리핑을 피한다(F07) */}
        {detail && comparable && (
          <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
            <AnalysisCompareReport ref={reportRef} detail={detail} pdf />
          </div>
        )}

        {/* 하단 */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="danger" size="sm" icon={Trash2} loading={deleting} onClick={onDelete}>
            이력 삭제
          </Button>
          {detail && comparable ? (
            <PdfDownloadButton targetRef={reportRef} filename={pdfName} title="VESTRA 분석 비교 리포트" />
          ) : (
            <Button variant="secondary" size="sm" disabled>
              PDF 내보내기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
