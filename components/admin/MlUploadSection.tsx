"use client";

import { useState, useCallback, useRef } from "react";
import { Brain, Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button } from "@/components/common";

// ─── Props ───

interface MlUploadSectionProps {
  onRefresh: () => void;
}

// ─── Component ───

export function MlUploadSection({ onRefresh }: MlUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [rawTextInput, setRawTextInput] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── 파일 업로드 ───

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const file = files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "txt"].includes(ext || "")) {
        setUploadError("PDF 또는 TXT 파일만 업로드할 수 있습니다.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("파일 크기가 10MB를 초과합니다.");
        return;
      }

      setUploadError(null);
      setUploadSuccess(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/training-data", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUploadSuccess(
          `${file.name} 업로드 완료 (신뢰도: ${data.confidence}%, 갑구: ${data.gapguCount}건, 을구: ${data.eulguCount}건)`,
        );
        onRefresh();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "업로드 실패");
      } finally {
        setIsUploading(false);
      }
    },
    [onRefresh],
  );

  const handleTextSubmit = useCallback(async () => {
    if (!rawTextInput.trim()) {
      setUploadError("텍스트를 입력해주세요.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const res = await fetch("/api/admin/training-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: rawTextInput, sourceFileName: "직접입력" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadSuccess(
        `텍스트 등록 완료 (신뢰도: ${data.confidence}%, 갑구: ${data.gapguCount}건, 을구: ${data.eulguCount}건)`,
      );
      setRawTextInput("");
      onRefresh();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setIsUploading(false);
    }
  }, [rawTextInput, onRefresh]);

  // ─── 드래그앤드롭 ───

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) handleFileUpload(files);
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length) handleFileUpload(files);
      if (e.target) e.target.value = "";
    },
    [handleFileUpload],
  );

  // ─── 렌더링 ───

  return (
    <Card className="p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Brain size={16} strokeWidth={1.5} className="text-primary" />
        등기부등본 학습 데이터 등록
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 파일 업로드 */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-gray-50",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-primary">처리 중...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} strokeWidth={1.5} className="text-gray-400" />
              <p className="text-sm text-gray-600">PDF/TXT 파일을 드래그하세요</p>
              <p className="text-xs text-gray-400">최대 10MB, AES-256-GCM 암호화 저장</p>
            </div>
          )}
        </div>

        {/* 텍스트 직접 입력 */}
        <div className="flex flex-col gap-2">
          <textarea
            value={rawTextInput}
            onChange={(e) => setRawTextInput(e.target.value)}
            placeholder="등기부등본 텍스트를 직접 붙여넣기..."
            className="h-32 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm focus:border-primary focus:outline-none"
          />
          <Button
            onClick={handleTextSubmit}
            disabled={isUploading || !rawTextInput.trim()}
            className="self-end"
          >
            <FileText size={14} strokeWidth={1.5} className="mr-1" />
            분석 및 등록
          </Button>
        </div>
      </div>

      {/* 메시지 */}
      {uploadError && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{uploadError}</div>
      )}
      {uploadSuccess && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">
          {uploadSuccess}
        </div>
      )}
    </Card>
  );
}
