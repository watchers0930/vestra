"use client";

import { FileSearch } from "lucide-react";
import { Button } from "@/components/common";
import { ScrFileUploadStep } from "@/components/feasibility/ScrFileUploadStep";
import { ConflictResolver } from "@/components/feasibility/ConflictResolver";
import { DOCUMENT_SLOTS } from "@/lib/feasibility/scr-types";
import type { ScrDocumentCategory, ProjectType } from "@/lib/feasibility/scr-types";
import type { DataConflict, ResolvedConflict, ParseResponse } from "@/lib/feasibility/feasibility-types";

interface Props {
  projectType: ProjectType;
  setProjectType: (t: ProjectType) => void;
  categorizedFiles: Map<ScrDocumentCategory, File[]>;
  onFilesChange: (map: Map<ScrDocumentCategory, File[]>) => void;
  parsedInfo: ParseResponse["parsedFiles"] | null;
  conflicts: DataConflict[];
  loading: boolean;
  onParse: () => void;
  onConflictsResolved: (resolved: ResolvedConflict[]) => void;
}

export function UploadStep({
  projectType, setProjectType,
  categorizedFiles, onFilesChange,
  parsedInfo, conflicts,
  loading, onParse, onConflictsResolved,
}: Props) {
  const isRequiredComplete = DOCUMENT_SLOTS
    .filter((s) => s.required)
    .every((s) => (categorizedFiles.get(s.category)?.length ?? 0) > 0);

  return (
    <div className="space-y-4">
      <ScrFileUploadStep
        projectType={projectType}
        onProjectTypeChange={setProjectType}
        categorizedFiles={categorizedFiles}
        onFilesChange={onFilesChange}
      />

      {/* 파싱 결과 미리보기 */}
      {parsedInfo && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
          <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider mb-3">파싱 결과</p>
          <div className="space-y-2">
            {parsedInfo.map((f) => (
              <div key={f.filename} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-gray-50/80">
                <span className="font-medium text-[#1d1d1f]">{f.filename}</span>
                <div className="flex items-center gap-3 text-[#6e6e73]">
                  <span>{f.extractedCount}개 항목</span>
                  {typeof f.pageCount === "number" && <span>{f.pageCount}p</span>}
                  <span>{(f.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
                  <span className="font-mono text-emerald-600">신뢰도 {f.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 불일치 해결 */}
      {conflicts.length > 0 && (
        <ConflictResolver conflicts={conflicts} onResolve={onConflictsResolved} />
      )}

      {/* 분석 시작 버튼 */}
      {conflicts.length === 0 && (
        <Button
          onClick={onParse}
          loading={loading}
          disabled={!isRequiredComplete}
          icon={FileSearch}
          fullWidth
          size="lg"
        >
          문서 분석 시작
        </Button>
      )}
    </div>
  );
}
