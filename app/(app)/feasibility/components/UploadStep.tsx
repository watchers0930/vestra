"use client";

import { FileSearch, ClipboardList, Sparkles } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 업로드 영역 카드 */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 카드 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "linear-gradient(135deg, #fafbff 0%, #ffffff 100%)" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(148deg, #0071e3, #0058b0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardList size={20} color="#fff" strokeWidth={1.8} />
          </div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 2px" }}>분석 서류 업로드</p>
            <p style={{ fontSize: "12px", color: "#6e6e73", margin: 0 }}>사업계획서, 감정평가서 등 관련 서류를 카테고리별로 업로드하세요</p>
          </div>
        </div>
        {/* 본문 */}
        <div style={{ padding: "24px" }}>
          <ScrFileUploadStep
            projectType={projectType}
            onProjectTypeChange={setProjectType}
            categorizedFiles={categorizedFiles}
            onFilesChange={onFilesChange}
          />
        </div>
      </div>

      {/* 파싱 결과 미리보기 */}
      {parsedInfo && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} color="#22c55e" strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>파싱 결과</p>
              <p style={{ fontSize: "11px", color: "#6e6e73", margin: 0 }}>{parsedInfo.length}개 문서 분석 완료</p>
            </div>
          </div>
          <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {parsedInfo.map((f) => (
              <div key={f.filename} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#1d1d1f" }}>{f.filename}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "11px", color: "#6e6e73" }}>{f.extractedCount}개 항목</span>
                  {typeof f.pageCount === "number" && <span style={{ fontSize: "11px", color: "#6e6e73" }}>{f.pageCount}p</span>}
                  <span style={{ fontSize: "11px", color: "#6e6e73" }}>{(f.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "6px" }}>신뢰도 {f.confidence}%</span>
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
            width: "100%", padding: "16px", borderRadius: "16px", border: "none", cursor: loading || !isRequiredComplete ? "not-allowed" : "pointer",
            background: loading || !isRequiredComplete ? "#e5e5e7" : "linear-gradient(148deg, #0071e3, #0058b0)",
            color: loading || !isRequiredComplete ? "#aeaeb2" : "#fff",
            fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            boxShadow: loading || !isRequiredComplete ? "none" : "0 4px 20px rgba(0,113,227,0.30)",
            transition: "all 0.2s",
          }}
        >
          {loading
            ? <><span style={{ width: "18px", height: "18px", border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> 분석 중...</>
            : <><FileSearch size={18} strokeWidth={2} /> 문서 분석 시작</>
          }
        </button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
