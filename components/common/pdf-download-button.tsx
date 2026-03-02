"use client";

import { useState, useRef, type RefObject } from "react";
import { Download, Loader2 } from "lucide-react";

interface PdfDownloadButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  filename?: string;
  title?: string;
  className?: string;
}

export default function PdfDownloadButton({
  targetRef,
  filename = "vestra-report.pdf",
  title = "VESTRA 분석 리포트",
  className = "",
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!targetRef.current || loading) return;
    setLoading(true);
    try {
      const { exportToPdf } = await import("@/lib/pdf-export");
      await exportToPdf({ element: targetRef.current, filename, title });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Download size={16} />
      )}
      {loading ? "생성 중..." : "PDF 다운로드"}
    </button>
  );
}
