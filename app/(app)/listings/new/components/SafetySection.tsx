"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldCheck, FileText, Users, Loader2, X, Upload, ChevronDown } from "lucide-react";

export interface SafetyDoc {
  type: "건축물대장" | "전입세대열람";
  url: string;
  filename: string;
}

interface Props {
  analysisId: string;
  onAnalysisIdChange: (v: string) => void;
  safetyDocs: SafetyDoc[];
  onDocsChange: (docs: SafetyDoc[]) => void;
}

interface AnalysisOption { id: string; typeLabel: string; address: string; createdAt: string; }

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #d2d2d7", borderRadius: 10,
  padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#fff", color: "#1d1d1f",
};

export function SafetySection({ analysisId, onAnalysisIdChange, safetyDocs, onDocsChange }: Props) {
  const [analyses, setAnalyses] = useState<AnalysisOption[]>([]);
  const [uploading, setUploading] = useState<"건축물대장" | "전입세대열람" | null>(null);
  const [uploadError, setUploadError] = useState("");
  const buildingRef = useRef<HTMLInputElement>(null);
  const tenantRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/my-analyses")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.analyses) setAnalyses(data.analyses); })
      .catch(() => {});
  }, []);

  async function uploadDoc(file: File, type: SafetyDoc["type"]) {
    setUploading(type);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/listings/temp-doc", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "업로드 실패");
      }
      const { url } = await res.json();
      onDocsChange([...safetyDocs.filter((d) => d.type !== type), { type, url, filename: file.name }]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "업로드 오류");
    } finally {
      setUploading(null);
    }
  }

  function removeDoc(type: SafetyDoc["type"]) {
    onDocsChange(safetyDocs.filter((d) => d.type !== type));
  }

  const buildingDoc = safetyDocs.find((d) => d.type === "건축물대장");
  const tenantDoc   = safetyDocs.find((d) => d.type === "전입세대열람");

  return (
    <div
      style={{
        border: "1.5px solid rgba(52,199,89,0.25)", borderRadius: 14,
        padding: 18, background: "rgba(52,199,89,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <ShieldCheck size={17} strokeWidth={2} style={{ color: "#34c759" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>안전 증명</span>
        <span style={{ fontSize: 11, color: "#6e6e73" }}>— 임차인에게 신뢰를 줍니다 (선택)</span>
      </div>

      {/* ① AI 권리분석 연동 */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
          <FileText size={11} strokeWidth={2} style={{ display: "inline", marginRight: 5 }} />
          AI 권리분석 결과 연동
        </label>
        <div style={{ position: "relative" }}>
          <select
            style={{ ...inputStyle, appearance: "none", paddingRight: 32, color: analysisId ? "#1d1d1f" : "#aeaeb2" }}
            value={analysisId}
            onChange={(e) => onAnalysisIdChange(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.typeLabel}] {a.address} ({new Date(a.createdAt).toLocaleDateString("ko-KR")})
              </option>
            ))}
          </select>
          <ChevronDown size={14} strokeWidth={2} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6e6e73", pointerEvents: "none" }} />
        </div>
        {analysisId && (
          <p style={{ fontSize: 11, color: "#34c759", marginTop: 4 }}>✓ AI분석 결과가 매물에 첨부됩니다</p>
        )}
      </div>

      {/* ② 건축물대장 */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
          <FileText size={11} strokeWidth={2} style={{ display: "inline", marginRight: 5 }} />
          건축물대장
        </label>
        {buildingDoc ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)" }}>
            <FileText size={13} strokeWidth={1.5} style={{ color: "#34c759", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#1d1d1f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {buildingDoc.filename}
            </span>
            <button onClick={() => removeDoc("건축물대장")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#6e6e73", display: "flex" }}>
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => buildingRef.current?.click()}
            disabled={uploading === "건축물대장"}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer",
              border: "1.5px dashed #d2d2d7", background: "#f9f9f9",
              fontSize: 12, fontWeight: 500, color: "#6e6e73",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {uploading === "건축물대장"
              ? <><Loader2 size={13} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />업로드 중...</>
              : <><Upload size={13} strokeWidth={2} />건축물대장 첨부</>
            }
          </button>
        )}
        <input ref={buildingRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f, "건축물대장"); e.target.value = ""; }} />
      </div>

      {/* ③ 전입세대 열람 */}
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
          <Users size={11} strokeWidth={2} style={{ display: "inline", marginRight: 5 }} />
          전입세대 열람 확인서
        </label>
        {tenantDoc ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)" }}>
            <FileText size={13} strokeWidth={1.5} style={{ color: "#34c759", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#1d1d1f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tenantDoc.filename}
            </span>
            <button onClick={() => removeDoc("전입세대열람")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#6e6e73", display: "flex" }}>
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => tenantRef.current?.click()}
            disabled={uploading === "전입세대열람"}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10, cursor: "pointer",
              border: "1.5px dashed #d2d2d7", background: "#f9f9f9",
              fontSize: 12, fontWeight: 500, color: "#6e6e73",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {uploading === "전입세대열람"
              ? <><Loader2 size={13} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />업로드 중...</>
              : <><Upload size={13} strokeWidth={2} />전입세대 열람 첨부</>
            }
          </button>
        )}
        <input ref={tenantRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f, "전입세대열람"); e.target.value = ""; }} />
      </div>

      {uploadError && (
        <p style={{ fontSize: 11, color: "#c0392b", marginTop: 10 }}>{uploadError}</p>
      )}
    </div>
  );
}
