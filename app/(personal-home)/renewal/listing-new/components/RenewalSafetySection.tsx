"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldCheck, FileText, Users, Loader2, X, Upload } from "lucide-react";
import type { SafetyDoc } from "@/app/(app)/listings/new/components/SafetySection";
import s from "../listing-new.module.css";

interface Props {
  analysisId: string;
  onAnalysisIdChange: (v: string) => void;
  safetyDocs: SafetyDoc[];
  onDocsChange: (docs: SafetyDoc[]) => void;
}

interface AnalysisOption { id: string; typeLabel: string; address: string; createdAt: string; }

export function RenewalSafetySection({ analysisId, onAnalysisIdChange, safetyDocs, onDocsChange }: Props) {
  const [analyses, setAnalyses] = useState<AnalysisOption[]>([]);
  const [uploading, setUploading] = useState<SafetyDoc["type"] | null>(null);
  const [uploadError, setUploadError] = useState("");
  const buildingRef = useRef<HTMLInputElement>(null);
  const tenantRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/my-analyses")
      .then((r) => (r.ok ? r.json() : null))
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
  const tenantDoc = safetyDocs.find((d) => d.type === "전입세대열람");

  const docRow = (
    type: SafetyDoc["type"],
    doc: SafetyDoc | undefined,
    ref: React.RefObject<HTMLInputElement | null>,
    Icon: typeof FileText,
    label: string,
  ) => (
    <div className={s.safetyField}>
      <label className={s.label}><Icon size={11} strokeWidth={2} style={{ display: "inline", marginRight: 5, verticalAlign: "-1px" }} />{label}</label>
      {doc ? (
        <div className={s.docChip}>
          <FileText size={13} strokeWidth={1.5} style={{ color: "#2e4bd8", flexShrink: 0 }} />
          <span className={s.docName}>{doc.filename}</span>
          <button type="button" onClick={() => removeDoc(type)} className={s.docDel}><X size={13} strokeWidth={2.5} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading === type} className={s.uploadBtn}>
          {uploading === type
            ? <><Loader2 size={13} strokeWidth={2} className={s.spin} />업로드 중...</>
            : <><Upload size={13} strokeWidth={2} />{label} 첨부</>}
        </button>
      )}
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f, type); e.target.value = ""; }} />
    </div>
  );

  return (
    <div className={s.safetyBox}>
      <div className={s.safetyHead}>
        <ShieldCheck size={17} strokeWidth={2} style={{ color: "#2e4bd8" }} />
        <span className={s.safetyTitle}>안전 증명</span>
        <span className={s.safetyNote}>— 임차인에게 신뢰를 줍니다 (선택)</span>
      </div>

      <div className={s.safetyField}>
        <label className={s.label}><FileText size={11} strokeWidth={2} style={{ display: "inline", marginRight: 5, verticalAlign: "-1px" }} />AI 권리분석 결과 연동</label>
        <select className={s.select} value={analysisId} onChange={(e) => onAnalysisIdChange(e.target.value)}>
          <option value="">선택 안 함</option>
          {analyses.map((a) => (
            <option key={a.id} value={a.id}>[{a.typeLabel}] {a.address} ({new Date(a.createdAt).toLocaleDateString("ko-KR")})</option>
          ))}
        </select>
        {analysisId && <p className={s.ok}>✓ AI분석 결과가 매물에 첨부됩니다</p>}
      </div>

      {docRow("건축물대장", buildingDoc, buildingRef, FileText, "건축물대장")}
      {docRow("전입세대열람", tenantDoc, tenantRef, Users, "전입세대 열람 확인서")}

      {uploadError && <p className={s.error} style={{ marginTop: 10 }}>{uploadError}</p>}
    </div>
  );
}
