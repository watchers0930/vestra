"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck, AlertTriangle, FileText, Lock, type LucideIcon } from "lucide-react";
import { JeonseInputForm } from "./components/JeonseInputForm";
import { JeonseResultPanel } from "./components/JeonseResultPanel";
import { useJeonseAnalysis } from "./hooks/useJeonseAnalysis";

const FEATURE_CHIPS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck,    label: "전세권 설정 판단" },
  { icon: AlertTriangle,  label: "전세사기 위험도"  },
  { icon: FileText,       label: "서류 자동 생성"  },
  { icon: Lock,           label: "보증보험 판단"   },
];

export default function JeonsePage() {
  const {
    formData, setFormData,
    loading, analysis,
    fraudRisk, fraudLoading,
    docLoading, generatedDoc,
    activeDocType,
    guaranteeResult,
    checklist, setChecklist,
    resultRef,
    handleAnalyze, handleGenerateDoc, copyToClipboard,
  } = useJeonseAnalysis();

  return (
    <div style={{ paddingBottom: "48px" }}>
      {/* ── 히어로 배너 ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "28px",
          background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
          marginTop: "10px",
          marginBottom: "28px",
        }}
      >
        <div style={{ pointerEvents: "none", position: "absolute", top: "-80px", right: "-20px", height: "320px", width: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div style={{ position: "relative", zIndex: 1, padding: "36px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
          <div>
            {/* 브레드크럼 */}
            <nav style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
              <Link href="/jeonse" style={{ fontSize: "11px", color: "rgba(41,151,255,0.80)", textDecoration: "none", fontWeight: 500 }}>
                전세보호
              </Link>
              <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={2} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>전세 안전 분석</span>
            </nav>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "4px 11px", borderRadius: "20px",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const,
                color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)",
                marginBottom: "14px",
              }}
            >
              🛡️ 전세 안전 분석
            </div>
            <h1 style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
              전세권 설정 및 임차권등기명령 AI 분석
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.42)", marginTop: "8px", marginBottom: 0 }}>
              계약 정보를 입력하면 전세권 설정 필요성과<br />사기 위험도를 AI가 자동 분석합니다.
            </p>
          </div>
          <div className="hidden md:flex" style={{ flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {FEATURE_CHIPS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 16px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", minWidth: "166px",
                }}
              >
                <Icon size={15} strokeWidth={1.6} style={{ color: "rgba(255,255,255,0.65)", flexShrink: 0 }} />
                <span style={{ fontSize: "12.5px", fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid-cols-1 lg:grid-cols-2">
        <JeonseInputForm
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          onAnalyze={handleAnalyze}
        />
        <JeonseResultPanel
          loading={loading}
          analysis={analysis}
          fraudRisk={fraudRisk}
          fraudLoading={fraudLoading}
          generatedDoc={generatedDoc}
          activeDocType={activeDocType}
          guaranteeResult={guaranteeResult}
          checklist={checklist}
          setChecklist={setChecklist}
          resultRef={resultRef}
          formData={formData}
          docLoading={docLoading}
          onGenerateDoc={handleGenerateDoc}
          onCopy={copyToClipboard}
        />
      </div>
    </div>
  );
}
