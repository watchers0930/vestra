"use client";

import { useState, useCallback } from "react";
import { Button } from "./Button";
import { Download } from "lucide-react";

interface PdfDownloadButtonProps {
  /** CSS selector or ref for the element to capture */
  targetSelector: string;
  filename?: string;
  title?: string;
  className?: string;
}

export function PdfDownloadButton({
  targetSelector,
  filename = "vestra-report.pdf",
  title = "VESTRA 분석 리포트",
  className,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    const element = document.querySelector(targetSelector) as HTMLElement;
    if (!element) return;

    setLoading(true);
    try {
      const { exportToPdf } = await import("@/lib/pdf-export");
      await exportToPdf({ element, filename, title });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setLoading(false);
    }
  }, [targetSelector, filename, title]);

  return (
    <Button
      variant="secondary"
      icon={Download}
      loading={loading}
      onClick={handleDownload}
      className={className}
      size="sm"
    >
      PDF 저장
    </Button>
  );
}
