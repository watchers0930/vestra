"use client";

import { FileUploadZone } from "./FileUploadZone";
import type { ProjectType } from "@/lib/feasibility/scr-types";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "아파트", label: "아파트" },
  { value: "주상복합", label: "주상복합" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "지식산업센터", label: "지식산업센터" },
  { value: "재건축", label: "재건축" },
  { value: "재개발", label: "재개발" },
  { value: "생활형숙박시설", label: "생활형숙박시설" },
];

interface ScrFileUploadStepProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  projectType: ProjectType;
  onProjectTypeChange: (type: ProjectType) => void;
}

export function ScrFileUploadStep({
  files,
  onFilesChange,
  projectType,
  onProjectTypeChange,
}: ScrFileUploadStepProps) {
  return (
    <div className="space-y-6">
      {/* 사업 유형 선택 */}
      <div>
        <label className="block text-xs font-semibold text-[#6e6e73] mb-2">
          사업 유형
        </label>
        <select
          value={projectType}
          onChange={(e) => onProjectTypeChange(e.target.value as ProjectType)}
          className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
        >
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* 파일 업로드 */}
      <div>
        <label className="block text-xs font-semibold text-[#6e6e73] mb-2">
          분석 문서 업로드
        </label>
        <FileUploadZone
          files={files}
          onChange={onFilesChange}
          loading={false}
          maxFiles={10}
          maxSizeMB={10}
          acceptTypes={[".pdf", ".docx", ".xlsx", ".hwp"]}
        />
      </div>

      {/* 안내 */}
      <div className="rounded-xl bg-[#f5f5f7] p-4">
        <p className="text-xs font-semibold text-[#1d1d1f] mb-1">지원 문서 형식</p>
        <ul className="text-xs text-[#6e6e73] space-y-0.5">
          <li>- 사업타당성 분석 보고서 (PDF, HWP)</li>
          <li>- 사업수지 분석표 (XLSX)</li>
          <li>- 분양가 검토서, 시장 분석 보고서 (DOCX, PDF)</li>
          <li>- 최대 10개 파일, 개당 10MB 이내</li>
        </ul>
      </div>
    </div>
  );
}
