"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScrReportData } from "@/lib/feasibility/scr-types";

interface ScrPdfDownloadProps {
  data: ScrReportData;
  className?: string;
}

/**
 * SCR 보고서 PDF(HTML) 다운로드 버튼
 *
 * renderScrReportHTML로 완전한 A4 인쇄용 HTML 문서를 생성한 뒤,
 * Blob → 새 탭에서 열거나 HTML 파일로 다운로드합니다.
 * 브라우저의 "PDF로 인쇄" 기능으로 실제 PDF 변환이 가능합니다.
 */
export function ScrPdfDownload({ data, className }: ScrPdfDownloadProps) {
  const [loading, setLoading] = useState(false);

  /** 날짜 포맷 (YYYYMMDD) */
  const formatDate = (iso?: string): string => {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  };

  /** 파일명 생성 */
  const getFilename = (): string => {
    const projectName = data.frontMatter.projectName || "사업";
    const date = formatDate(data.metadata.generatedAt);
    // 파일명에 사용 불가한 문자 제거
    const safeName = projectName.replace(/[\\/:*?"<>|]/g, "_");
    return `SCR_분석보고서_${safeName}_${date}.html`;
  };

  /** HTML 생성 후 다운로드 */
  const handleDownload = useCallback(async () => {
    setLoading(true);

    try {
      // 동적 임포트 — 번들 크기 최적화
      const { renderScrReportHTML } = await import("@/lib/feasibility/scr-report-html");
      const html = renderScrReportHTML(data);

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // 새 탭에서 열기 — 브라우저 인쇄 대화상자로 PDF 변환 가능
      const newWindow = window.open(url, "_blank");

      if (newWindow) {
        // 새 탭이 로드된 후 자동으로 인쇄 대화상자 표시
        newWindow.addEventListener("load", () => {
          newWindow.print();
        });
      } else {
        // 팝업 차단 시 파일 다운로드로 폴백
        const a = document.createElement("a");
        a.href = url;
        a.download = getFilename();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // 메모리 정리 (약간의 딜레이 후)
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("PDF 다운로드 실패:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors",
        "bg-[#f5f5f7] hover:bg-gray-200 text-[#1d1d1f]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "print:hidden",
        className
      )}
    >
      {loading ? (
        <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
      ) : (
        <Download size={14} strokeWidth={1.5} />
      )}
      PDF 다운로드
    </button>
  );
}
