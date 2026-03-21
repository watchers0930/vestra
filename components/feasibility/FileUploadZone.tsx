"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  X,
  CloudUpload,
} from "lucide-react";

interface FileUploadZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  loading: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptTypes?: string[];
}

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  pdf: { icon: FileText, color: "text-red-500", bg: "bg-red-50" },
  docx: { icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  doc: { icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-50" },
  xls: { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-50" },
  hwp: { icon: FileText, color: "text-cyan-500", bg: "bg-cyan-50" },
  hwpx: { icon: FileText, color: "text-cyan-500", bg: "bg-cyan-50" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileUploadZone({
  files,
  onChange,
  loading,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptTypes = [".pdf", ".docx", ".xlsx", ".hwp"],
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndAdd = useCallback(
    (incoming: FileList | File[]) => {
      const maxSize = maxSizeMB * 1024 * 1024;
      const newFiles: File[] = [];
      setError(null);

      for (const file of Array.from(incoming)) {
        if (files.length + newFiles.length >= maxFiles) {
          setError(`최대 ${maxFiles}개까지 업로드 가능합니다.`);
          break;
        }
        if (file.size > maxSize) {
          setError(`${file.name}: ${maxSizeMB}MB를 초과합니다.`);
          continue;
        }
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!acceptTypes.includes(ext)) {
          setError(`${file.name}: 지원하지 않는 파일 형식입니다.`);
          continue;
        }
        if (files.some((f) => f.name === file.name && f.size === file.size)) {
          continue;
        }
        newFiles.push(file);
      }

      if (newFiles.length) onChange([...files, ...newFiles]);
    },
    [files, onChange, maxFiles, maxSizeMB, acceptTypes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!loading) validateAndAdd(e.dataTransfer.files);
    },
    [loading, validateAndAdd]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={cn(
          "group relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer",
          "flex flex-col items-center justify-center py-12 px-6",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-gray-200 hover:border-primary/40 hover:bg-gray-50/50",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptTypes.join(",")}
          onChange={(e) => e.target.files && validateAndAdd(e.target.files)}
          className="hidden"
          disabled={loading}
        />

        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
          isDragging
            ? "bg-[#f5f5f7] text-[#1d1d1f] scale-110"
            : "bg-[#f5f5f7] text-[#6e6e73] group-hover:text-[#1d1d1f] group-hover:scale-105"
        )}>
          {isDragging ? (
            <CloudUpload size={28} strokeWidth={1.5} />
          ) : (
            <Upload size={28} strokeWidth={1.5} />
          )}
        </div>

        <p className="text-sm font-medium text-[#1d1d1f]">
          {isDragging ? "여기에 놓으세요" : "파일을 드래그하거나 클릭하여 업로드"}
        </p>
        <p className="text-xs text-[#6e6e73] mt-1">
          PDF, DOCX, XLSX, HWP (최대 {maxFiles}개, 개당 {maxSizeMB}MB)
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#6e6e73] px-1">
            업로드된 파일 ({files.length}/{maxFiles})
          </p>
          {files.map((file, i) => {
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            const meta = FILE_ICONS[ext] || { icon: FileText, color: "text-gray-500", bg: "bg-gray-50" };
            const Icon = meta.icon;

            return (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm"
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", meta.bg)}>
                  <Icon size={18} className={meta.color} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] truncate">{file.name}</p>
                  <p className="text-xs text-[#6e6e73]">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
