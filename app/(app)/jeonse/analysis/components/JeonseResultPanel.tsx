"use client";

import { RefObject } from "react";
import Link from "next/link";
import {
  Shield, FileText, CheckCircle, AlertTriangle, Copy, Download, TrendingUp, Loader2,
} from "lucide-react";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { ScholarPapers } from "@/components/results";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
import FraudRiskCard from "@/components/results/FraudRiskCard";
import { GuaranteeInsuranceCard } from "@/components/results";
import { KaptInfoCard, type KaptInfoData } from "@/components/common/KaptInfoCard";
import LandlordTracker from "@/components/landlord/LandlordTracker";
import { needsLabel, riskLabel } from "../constants";
import type { JeonseAnalysis, GeneratedDocument, JeonseFormData } from "../types";
import type { FraudRiskResult } from "@/lib/patent-types";
import type { GuaranteeInsuranceResult } from "@/lib/guarantee-insurance";

interface Props {
  loading: boolean;
  analysis: JeonseAnalysis | null;
  fraudRisk: FraudRiskResult | null;
  fraudLoading: boolean;
  generatedDoc: GeneratedDocument | null;
  activeDocType: "jeonse" | "lease";
  guaranteeResult: GuaranteeInsuranceResult | null;
  kaptInfo: KaptInfoData | null;
  checklist: Record<string, boolean>;
  setChecklist: (v: Record<string, boolean>) => void;
  resultRef: RefObject<HTMLDivElement | null>;
  formData: JeonseFormData;
  docLoading: boolean;
  onGenerateDoc: (type: "jeonse" | "lease") => void;
  onCopy: (text: string) => void;
}

const NEEDS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  required:    { color: "#ff3b30", bg: "rgba(255,59,48,0.10)",   border: "rgba(255,59,48,0.22)"  },
  recommended: { color: "#b86f00", bg: "rgba(255,159,10,0.10)",  border: "rgba(255,159,10,0.22)" },
  optional:    { color: "#1a9e45", bg: "rgba(48,209,88,0.10)",   border: "rgba(48,209,88,0.22)"  },
};

const RISK_STYLE: Record<string, { color: string; bg: string }> = {
  high:   { color: "#ff3b30", bg: "rgba(255,59,48,0.10)"  },
  medium: { color: "#b86f00", bg: "rgba(255,159,10,0.10)" },
  low:    { color: "#1a9e45", bg: "rgba(48,209,88,0.10)"  },
};

export function JeonseResultPanel({
  loading, analysis,
  fraudRisk, fraudLoading,
  generatedDoc, activeDocType,
  guaranteeResult,
  kaptInfo,
  checklist, setChecklist,
  resultRef, formData,
  docLoading, onGenerateDoc, onCopy,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 로딩 */}
      {loading && (
        <div
          aria-busy="true"
          aria-live="polite"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f", textAlign: "center", marginBottom: "4px" }}>
            전세 안전 분석 중...
          </p>
          <AnalysisLoader
            steps={["계약 정보 분석 중...", "위험도 산출 중...", "보증보험 가능 여부 확인 중...", "AI 의견 생성 중..."]}
            interval={2500}
          />
        </div>
      )}

      {analysis && !loading && (
        <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 상단 액션 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <AiDisclaimer compact />
            <PdfDownloadButton targetRef={resultRef} filename="vestra-jeonse-analysis.pdf" title="VESTRA 전세분석 리포트" />
          </div>

          {/* K-apt 단지정보 */}
          {kaptInfo && <KaptInfoCard kaptInfo={kaptInfo} />}

          {/* 전세권 설정 판단 */}
          <div
            style={{
              background: "#fff",
              border: `1px solid ${NEEDS_STYLE[analysis.needsRegistration]?.border ?? "rgba(0,0,0,0.08)"}`,
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f" }}>전세권 설정 판단</h4>
              <span
                style={{
                  fontSize: "11px", fontWeight: 700,
                  padding: "4px 12px", borderRadius: "20px",
                  color: NEEDS_STYLE[analysis.needsRegistration]?.color ?? "#1d1d1f",
                  background: NEEDS_STYLE[analysis.needsRegistration]?.bg ?? "#f5f5f7",
                }}
              >
                {needsLabel[analysis.needsRegistration]?.text}
              </span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "11px", fontWeight: 600,
                  padding: "3px 10px", borderRadius: "20px",
                  color: RISK_STYLE[analysis.riskLevel]?.color ?? "#1d1d1f",
                  background: RISK_STYLE[analysis.riskLevel]?.bg ?? "#f5f5f7",
                }}
              >
                위험도: {riskLabel[analysis.riskLevel]?.text}
              </span>
            </div>
            <p style={{ fontSize: "13px", lineHeight: 1.65, color: "#6e6e73" }}>{analysis.reason}</p>
          </div>

          {/* 권고사항 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "20px 24px",
            }}
          >
            <h4
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                fontSize: "15px", fontWeight: 700, color: "#1d1d1f",
                marginBottom: "14px",
              }}
            >
              <AlertTriangle size={16} strokeWidth={1.5} style={{ color: "#ff9f0a" }} />
              권고사항
            </h4>
            <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0, margin: 0 }}>
              {analysis.recommendations.map((rec, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", lineHeight: 1.6 }}>
                  <CheckCircle size={15} strokeWidth={2} style={{ color: "#30d158", flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ color: "#1d1d1f" }}>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 필요 서류 체크리스트 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "20px 24px",
            }}
          >
            <h4
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                fontSize: "15px", fontWeight: 700, color: "#1d1d1f",
                marginBottom: "14px",
              }}
            >
              <FileText size={16} strokeWidth={1.5} style={{ color: "#6e6e73" }} />
              필요 서류 체크리스트
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {analysis.requiredDocuments.map((doc, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "10px",
                    padding: "10px 12px", borderRadius: "10px",
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = "#f5f5f7"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = "transparent"; }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[doc.name] || false}
                    onChange={(e) => setChecklist({ ...checklist, [doc.name]: e.target.checked })}
                    style={{ width: "15px", height: "15px", accentColor: "#0071e3", marginTop: "2px", flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>{doc.name}</div>
                    <div style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "2px" }}>발급처: {doc.where}</div>
                    {doc.note && <div style={{ fontSize: "11px", color: "#aeaeb2", marginTop: "1px" }}>{doc.note}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* AI 종합 의견 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,113,227,0.18)",
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,113,227,0.06)",
              padding: "20px 24px",
            }}
          >
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#004ab3", marginBottom: "10px" }}>AI 종합 의견</h4>
            <p style={{ fontSize: "13px", lineHeight: 1.75, color: "#1d1d1f" }}>{analysis.aiOpinion}</p>
          </div>

          {/* 전세사기 위험도 */}
          {fraudLoading && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#6e6e73" }}>
                <Loader2 size={14} className="animate-spin" />전세사기 위험도 분석 중...
              </div>
            </div>
          )}
          {fraudRisk && !fraudLoading && <FraudRiskCard result={fraudRisk} />}

          {/* 보증보험 가입 가능성 */}
          {guaranteeResult && <GuaranteeInsuranceCard result={guaranteeResult} />}

          {/* 임대인 종합 프로파일 */}
          <LandlordTracker ownerName={formData.landlordName} baseAddress={formData.propertyAddress} />

          {/* 문서 자동 생성 */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              padding: "20px 24px",
            }}
          >
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", marginBottom: "14px" }}>문서 자동 생성</h4>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              <button
                onClick={() => onGenerateDoc("jeonse")}
                disabled={docLoading}
                style={{
                  flex: 1,
                  minWidth: "160px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: docLoading && activeDocType === "jeonse" ? "rgba(0,0,0,0.07)" : "#0071e3",
                  color: docLoading && activeDocType === "jeonse" ? "#aeaeb2" : "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: docLoading ? "not-allowed" : "pointer",
                  boxShadow: docLoading ? "none" : "0 2px 10px rgba(0,113,227,0.25)",
                  transition: "all 0.15s",
                }}
              >
                {docLoading && activeDocType === "jeonse" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} strokeWidth={2} />}
                전세권설정등기 신청서
              </button>
              <button
                onClick={() => onGenerateDoc("lease")}
                disabled={docLoading}
                style={{
                  flex: 1,
                  minWidth: "160px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: docLoading && activeDocType === "lease" ? "rgba(0,0,0,0.07)" : "rgba(255,159,10,0.90)",
                  color: docLoading && activeDocType === "lease" ? "#aeaeb2" : "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: docLoading ? "not-allowed" : "pointer",
                  boxShadow: docLoading ? "none" : "0 2px 10px rgba(255,159,10,0.30)",
                  transition: "all 0.15s",
                }}
              >
                {docLoading && activeDocType === "lease" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} strokeWidth={2} />}
                임차권등기명령 신청서
              </button>
            </div>

            {generatedDoc && (
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px",
                    background: "#f5f5f7",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#1d1d1f" }}>{generatedDoc.title}</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      onClick={() => onCopy(generatedDoc.content)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "5px 10px", borderRadius: "8px",
                        background: "none", border: "none",
                        fontSize: "11.5px", color: "#6e6e73", cursor: "pointer",
                        transition: "color 0.12s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#0071e3"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6e6e73"; }}
                    >
                      <Copy size={12} strokeWidth={1.5} />복사
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([generatedDoc.content], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${generatedDoc.title}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "5px 10px", borderRadius: "8px",
                        background: "none", border: "none",
                        fontSize: "11.5px", color: "#6e6e73", cursor: "pointer",
                        transition: "color 0.12s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#0071e3"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6e6e73"; }}
                    >
                      <Download size={12} strokeWidth={1.5} />다운로드
                    </button>
                  </div>
                </div>
                <pre style={{ padding: "16px", fontSize: "11.5px", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: "400px", overflowY: "auto", color: "#1d1d1f" }}>
                  {generatedDoc.content}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 관련 학술논문 */}
      <ScholarPapers keywords={["전세 보증금", "임차인 보호", formData.propertyAddress?.split(" ").slice(0, 2).join(" ") || "부동산"].filter(Boolean)} />

      {/* 면책 조항 */}
      <div
        style={{
          padding: "16px 20px", borderRadius: "14px",
          background: "rgba(255,159,10,0.05)", border: "1px solid rgba(255,159,10,0.18)",
          fontSize: "12.5px", lineHeight: 1.65, color: "#6e6e73",
        }}
      >
        <strong style={{ color: "#b86f00" }}>면책 조항</strong><br />
        본 분석은 공개 데이터 기반의 참고용 정보이며, 법률적 조언이 아닙니다.
        임대인의 재정 상태, 근저당 설정 등 비공개 정보는 반영되지 않을 수 있습니다.
        전세 계약 체결 시 반드시 법무사, 공인중개사 등 전문가와 상담하세요.
      </div>

      {/* 연관 분석 CTA */}
      {analysis && !loading && (
        <div
          style={{
            padding: "20px", borderRadius: "18px",
            background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: "12px" }}>
            이 물건으로 추가 분석
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              { href: "/rights",     icon: Shield,     label: "권리분석",  onClick: () => { if (formData.propertyAddress) localStorage.setItem("vestra_last_address", formData.propertyAddress); } },
              { href: "/prediction", icon: TrendingUp, label: "시세 전망", onClick: () => { if (formData.propertyAddress) localStorage.setItem("vestra_last_address", formData.propertyAddress); } },
            ].map(({ href, icon: Icon, label, onClick }) => (
              <Link
                key={href}
                href={href}
                onClick={onClick}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 16px", borderRadius: "12px",
                  border: "1px solid rgba(0,0,0,0.08)", background: "#fff",
                  fontSize: "13px", fontWeight: 500, color: "#1d1d1f", textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f7"; e.currentTarget.style.borderColor = "rgba(0,113,227,0.20)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; }}
              >
                <Icon size={15} strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
