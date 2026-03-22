"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calculator,
  BarChart3,
  Landmark,
  MapPin,
  TrendingUp,
  Paperclip,
  Upload,
  CheckCircle2,
  X,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  DOCUMENT_SLOTS,
  type ProjectType,
  type ScrDocumentCategory,
  type ScrDocumentSlot,
} from "@/lib/feasibility/scr-types";
import { useState } from "react";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "아파트", label: "아파트" },
  { value: "주상복합", label: "주상복합" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "지식산업센터", label: "지식산업센터" },
  { value: "재건축", label: "재건축" },
  { value: "재개발", label: "재개발" },
  { value: "생활형숙박시설", label: "생활형숙박시설" },
];

/** 아이콘명 → 컴포넌트 매핑 */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText,
  Calculator,
  BarChart3,
  Landmark,
  MapPin,
  TrendingUp,
  Paperclip,
};

const MAX_FILES_PER_SLOT = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface ScrFileUploadStepProps {
  projectType: ProjectType;
  onProjectTypeChange: (type: ProjectType) => void;
  categorizedFiles: Map<ScrDocumentCategory, File[]>;
  onFilesChange: (files: Map<ScrDocumentCategory, File[]>) => void;
}

/** 파일 크기 포맷 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 단일 슬롯 컴포넌트 */
function DocumentSlot({
  slot,
  files,
  onAdd,
  onReplace,
  onRemove,
  variant,
}: {
  slot: ScrDocumentSlot;
  files: File[];
  onAdd: (files: FileList) => void;
  onReplace: (index: number, file: File) => void;
  onRemove: (index: number) => void;
  variant: "required" | "optional";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const Icon = ICON_MAP[slot.icon] ?? FileText;
  const hasFiles = files.length > 0;
  const canAddMore = files.length < MAX_FILES_PER_SLOT;

  const acceptString = slot.acceptedFormats.join(",");

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fl = e.target.files;
      if (!fl || fl.length === 0) return;

      if (replaceIndexRef.current !== null) {
        onReplace(replaceIndexRef.current, fl[0]);
        replaceIndexRef.current = null;
      } else {
        onAdd(fl);
      }
      // reset input
      e.target.value = "";
    },
    [onAdd, onReplace]
  );

  const openFilePicker = () => {
    replaceIndexRef.current = null;
    inputRef.current?.click();
  };

  const openReplaceFilePicker = (index: number) => {
    replaceIndexRef.current = index;
    inputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "rounded-2xl border-2 transition-all",
        hasFiles
          ? "border-emerald-200 bg-emerald-50/30"
          : variant === "required"
          ? "border-dashed border-gray-200 bg-white hover:border-[#0071e3]/30 hover:bg-[#0071e3]/[0.02]"
          : "border-dashed border-gray-150 bg-gray-50/50 hover:border-gray-300"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        multiple={!replaceIndexRef.current && canAddMore}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="p-4">
        {/* 슬롯 헤더 */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              hasFiles ? "bg-emerald-100" : "bg-gray-100"
            )}
          >
            <Icon
              size={20}
              className={hasFiles ? "text-emerald-600" : "text-[#6e6e73]"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#1d1d1f]">
                {slot.label}
              </p>
              {slot.required && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0071e3]/10 text-[#0071e3]">
                  필수
                </span>
              )}
              {hasFiles && (
                <CheckCircle2
                  size={16}
                  className="text-emerald-500 shrink-0"
                />
              )}
            </div>
            <p className="text-xs text-[#6e6e73] mt-0.5 leading-relaxed">
              {slot.description}
            </p>
          </div>
        </div>

        {/* 파일 목록 또는 업로드 영역 */}
        {hasFiles ? (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100"
              >
                <FileText size={14} className="text-[#6e6e73] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1d1d1f] truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-[#86868b]">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => openReplaceFilePicker(idx)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  title="파일 변경"
                >
                  <RefreshCw size={12} className="text-[#6e6e73]" />
                </button>
                <button
                  onClick={() => onRemove(idx)}
                  className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                  title="파일 삭제"
                >
                  <X size={12} className="text-red-400" />
                </button>
              </div>
            ))}
            {canAddMore && (
              <button
                onClick={openFilePicker}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-200 text-xs text-[#6e6e73] hover:border-[#0071e3]/30 hover:text-[#0071e3] transition-all"
              >
                <Upload size={12} />
                파일 추가 ({files.length}/{MAX_FILES_PER_SLOT})
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={openFilePicker}
            className="w-full flex flex-col items-center gap-2 py-5 rounded-xl cursor-pointer"
          >
            <Upload size={20} className="text-[#86868b]" />
            <p className="text-xs font-medium text-[#6e6e73]">
              파일을 선택하세요
            </p>
            <p className="text-[10px] text-[#86868b]">
              {slot.acceptedFormats.join(", ")} | 최대 {MAX_FILE_SIZE_MB}MB
            </p>
          </button>
        )}
      </div>
    </div>
  );
}

export function ScrFileUploadStep({
  projectType,
  onProjectTypeChange,
  categorizedFiles,
  onFilesChange,
}: ScrFileUploadStepProps) {
  const [optionalOpen, setOptionalOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requiredSlots = DOCUMENT_SLOTS.filter((s) => s.required);
  const optionalSlots = DOCUMENT_SLOTS.filter((s) => !s.required);

  // 필수 충족도 계산
  const requiredFilledCount = requiredSlots.filter(
    (s) => (categorizedFiles.get(s.category)?.length ?? 0) > 0
  ).length;
  const requiredTotal = requiredSlots.length;
  const progressPercent = (requiredFilledCount / requiredTotal) * 100;

  /** 파일 추가 */
  const handleAdd = useCallback(
    (category: ScrDocumentCategory, fileList: FileList) => {
      setError(null);
      const currentFiles = categorizedFiles.get(category) ?? [];
      const newFiles: File[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        // 크기 검증
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setError(`"${file.name}" 파일이 ${MAX_FILE_SIZE_MB}MB를 초과합니다.`);
          continue;
        }
        // 슬롯 최대 개수 검증
        if (currentFiles.length + newFiles.length >= MAX_FILES_PER_SLOT) {
          setError(
            `슬롯당 최대 ${MAX_FILES_PER_SLOT}개 파일만 업로드할 수 있습니다.`
          );
          break;
        }
        // 형식 검증
        const slot = DOCUMENT_SLOTS.find((s) => s.category === category);
        if (slot) {
          const ext = "." + file.name.split(".").pop()?.toLowerCase();
          if (!slot.acceptedFormats.includes(ext)) {
            setError(
              `"${file.name}" 파일 형식이 허용되지 않습니다. (${slot.acceptedFormats.join(", ")})`
            );
            continue;
          }
        }
        newFiles.push(file);
      }

      if (newFiles.length > 0) {
        const next = new Map(categorizedFiles);
        next.set(category, [...currentFiles, ...newFiles]);
        onFilesChange(next);
      }
    },
    [categorizedFiles, onFilesChange]
  );

  /** 파일 교체 */
  const handleReplace = useCallback(
    (category: ScrDocumentCategory, index: number, file: File) => {
      setError(null);
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" 파일이 ${MAX_FILE_SIZE_MB}MB를 초과합니다.`);
        return;
      }
      const slot = DOCUMENT_SLOTS.find((s) => s.category === category);
      if (slot) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!slot.acceptedFormats.includes(ext)) {
          setError(
            `"${file.name}" 파일 형식이 허용되지 않습니다. (${slot.acceptedFormats.join(", ")})`
          );
          return;
        }
      }
      const currentFiles = [...(categorizedFiles.get(category) ?? [])];
      currentFiles[index] = file;
      const next = new Map(categorizedFiles);
      next.set(category, currentFiles);
      onFilesChange(next);
    },
    [categorizedFiles, onFilesChange]
  );

  /** 파일 삭제 */
  const handleRemove = useCallback(
    (category: ScrDocumentCategory, index: number) => {
      const currentFiles = [...(categorizedFiles.get(category) ?? [])];
      currentFiles.splice(index, 1);
      const next = new Map(categorizedFiles);
      if (currentFiles.length === 0) {
        next.delete(category);
      } else {
        next.set(category, currentFiles);
      }
      onFilesChange(next);
    },
    [categorizedFiles, onFilesChange]
  );

  return (
    <div className="space-y-6">
      {/* 사업 유형 선택 */}
      <div>
        <label className="block text-xs font-semibold text-[#6e6e73] mb-2">
          사업 유형
        </label>
        <select
          value={projectType}
          onChange={(e) =>
            onProjectTypeChange(e.target.value as ProjectType)
          }
          className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
        >
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* 서류 충족도 프로그레스 */}
      <div className="rounded-2xl border border-gray-100 bg-[#f5f5f7] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#1d1d1f]">
            서류 충족도
          </p>
          <p className="text-xs font-bold tabular-nums text-[#0071e3]">
            {requiredFilledCount}/{requiredTotal}
          </p>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              requiredFilledCount === requiredTotal
                ? "bg-emerald-500"
                : "bg-[#0071e3]"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-[#86868b] mt-1.5">
          필수 서류 {requiredTotal}종 중 {requiredFilledCount}종 제출 완료
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <X size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X size={12} className="text-red-400" />
          </button>
        </div>
      )}

      {/* 필수 서류 섹션 */}
      <div>
        <p className="text-xs font-bold text-[#1d1d1f] mb-3 uppercase tracking-wide">
          필수 서류 ({requiredTotal}종)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredSlots.map((slot) => (
            <DocumentSlot
              key={slot.category}
              slot={slot}
              files={categorizedFiles.get(slot.category) ?? []}
              onAdd={(fl) => handleAdd(slot.category, fl)}
              onReplace={(idx, file) =>
                handleReplace(slot.category, idx, file)
              }
              onRemove={(idx) => handleRemove(slot.category, idx)}
              variant="required"
            />
          ))}
        </div>
      </div>

      {/* 선택 서류 섹션 (접힘 가능) */}
      <div>
        <button
          onClick={() => setOptionalOpen((v) => !v)}
          className="flex items-center gap-2 mb-3 group"
        >
          <ChevronDown
            size={14}
            className={cn(
              "text-[#6e6e73] transition-transform",
              !optionalOpen && "-rotate-90"
            )}
          />
          <p className="text-xs font-bold text-[#6e6e73] uppercase tracking-wide group-hover:text-[#1d1d1f] transition-colors">
            선택 서류 ({optionalSlots.length}종)
          </p>
        </button>
        {optionalOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {optionalSlots.map((slot) => (
              <DocumentSlot
                key={slot.category}
                slot={slot}
                files={categorizedFiles.get(slot.category) ?? []}
                onAdd={(fl) => handleAdd(slot.category, fl)}
                onReplace={(idx, file) =>
                  handleReplace(slot.category, idx, file)
                }
                onRemove={(idx) => handleRemove(slot.category, idx)}
                variant="optional"
              />
            ))}
          </div>
        )}
      </div>

      {/* 하단 안내 */}
      <div className="rounded-xl bg-[#f5f5f7] p-4">
        <p className="text-xs text-[#6e6e73] leading-relaxed">
          필수 서류 {requiredTotal}종을 모두 제출해야 보고서 생성이 가능합니다.
          각 슬롯에 최대 {MAX_FILES_PER_SLOT}개 파일, 개당 {MAX_FILE_SIZE_MB}
          MB까지 업로드할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
