"use client";

import { useState, useCallback, type RefObject } from "react";
import { Button } from "./Button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/common/toast";

interface PdfDownloadButtonBaseProps {
  filename?: string;
  title?: string;
  className?: string;
}

interface PdfDownloadButtonWithRef extends PdfDownloadButtonBaseProps {
  targetRef: RefObject<HTMLElement | null>;
  targetSelector?: never;
}

interface PdfDownloadButtonWithSelector extends PdfDownloadButtonBaseProps {
  targetSelector: string;
  targetRef?: never;
}

type PdfDownloadButtonProps =
  | PdfDownloadButtonWithRef
  | PdfDownloadButtonWithSelector;

export function PdfDownloadButton({
  targetRef,
  targetSelector,
  filename = "vestra-report.pdf",
  title = "VESTRA 분석 리포트",
  className,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleDownload = useCallback(async () => {
    let element: HTMLElement | null = null;

    if (targetRef) {
      element = targetRef.current;
    } else if (targetSelector) {
      element = document.querySelector(targetSelector) as HTMLElement;
    }

    if (!element || loading) return;

    setLoading(true);
    try {
      const { exportToPdf } = await import("@/lib/pdf-export");
      await exportToPdf({ element, filename, title });
      showToast("PDF가 다운로드되었습니다.", "success");
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [targetRef, targetSelector, filename, title, loading, showToast]);

  return (
    <Button
      variant="secondary"
      icon={loading ? Loader2 : Download}
      loading={loading}
      onClick={handleDownload}
      className={className}
      size="sm"
    >
      {loading ? "생성 중..." : "PDF 다운로드"}
    </Button>
  );
}

export default PdfDownloadButton;
