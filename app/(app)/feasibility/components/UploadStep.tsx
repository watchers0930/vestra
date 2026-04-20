"use client";

import { FileSearch } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <ScrFileUploadStep
        projectType={projectType}
        onProjectTypeChange={setProjectType}
        categorizedFiles={categorizedFiles}
        onFilesChange={onFilesChange}
      />

      {/* 파싱 결과 미리보기 */}
      {parsedInfo && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "16px 20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6e6e73", margin: "0 0 12px" }}>파싱 결과</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {parsedInfo.map((f) => (
              <div key={f.filename} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px", background: "#f5f5f7" }}>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#1d1d1f" }}>{f.filename}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "11px", color: "#6e6e73" }}>{f.extractedCount}개 항목</span>
                  {typeof f.pageCount === "number" && <span style={{ fontSize: "11px", color: "#6e6e73" }}>{f.pageCount}p</span>}
                  <span style={{ fontSize: "11px", color: "#6e6e73" }}>{(f.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#1a9e45" }}>신뢰도 {f.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 불일치 해결 */}
      {conflicts.length > 0 && <ConflictResolver conflicts={conflicts} onResolve={onConflictsResolved} />}

      {/* 분석 시작 버튼 */}
      {conflicts.length === 0 && (
        <button
          onClick={onParse}
          disabled={loading || !isRequiredComplete}
          style={{
            width: "100%", padding: "14px", borderRadius: "14px", border: "none", cursor: loading || !isRequiredComplete ? "not-allowed" : "pointer",
            background: loading || !isRequiredComplete ? "#e5e5e7" : "linear-gradient(148deg, #0071e3, #0058b0)",
            color: loading || !isRequiredComplete ? "#aeaeb2" : "#fff",
            fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            boxShadow: loading || !isRequiredComplete ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
            transition: "all 0.15s",
          }}
        >
          {loading
            ? <><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> 분석 중...</>
            : <><FileSearch size={16} strokeWidth={2} /> 문서 분석 시작</>
          }
        </button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
