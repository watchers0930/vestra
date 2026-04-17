"use client";

import { RefObject } from "react";
import Link from "next/link";
import {
  Shield, FileText, CheckCircle, AlertTriangle, Copy, Download, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Alert, Button } from "@/components/common";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { ScholarPapers } from "@/components/results";
import { LoadingSpinner } from "@/components/loading";
import FraudRiskCard from "@/components/results/FraudRiskCard";
import { GuaranteeInsuranceCard } from "@/components/results";
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
  checklist: Record<string, boolean>;
  setChecklist: (v: Record<string, boolean>) => void;
  resultRef: RefObject<HTMLDivElement | null>;
  formData: JeonseFormData;
  docLoading: boolean;
  onGenerateDoc: (type: "jeonse" | "lease") => void;
  onCopy: (text: string) => void;
}

export function JeonseResultPanel({
  loading, analysis,
  fraudRisk, fraudLoading,
  generatedDoc, activeDocType,
  guaranteeResult,
  checklist, setChecklist,
  resultRef, formData,
  docLoading, onGenerateDoc, onCopy,
}: Props) {
  return (
    <div className="space-y-4">
      {loading && <LoadingSpinner message="전세 안전 분석 중..." />}

      {analysis && !loading && (
        <div ref={resultRef}>
          <div className="flex items-center justify-between mb-4">
            <AiDisclaimer compact />
            <PdfDownloadButton targetRef={resultRef} filename="vestra-jeonse-analysis.pdf" title="VESTRA 전세분석 리포트" />
          </div>

          {/* 전세권 설정 판단 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">전세권 설정 판단</h4>
              <span className={cn("px-3 py-1 rounded-full text-xs font-medium", needsLabel[analysis.needsRegistration].bg, needsLabel[analysis.needsRegistration].color)}>
                {needsLabel[analysis.needsRegistration].text}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", riskLabel[analysis.riskLevel].bg, riskLabel[analysis.riskLevel].color)}>
                위험도: {riskLabel[analysis.riskLevel].text}
              </span>
            </div>
            <p className="text-sm text-secondary">{analysis.reason}</p>
          </Card>

          {/* 권고사항 */}
          <Card className="p-5">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#1d1d1f]" strokeWidth={1.5} />
              권고사항
            </h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle size={16} className="text-[#1d1d1f] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 필요 서류 체크리스트 */}
          <Card className="p-5">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileText size={18} className="text-[#1d1d1f]" strokeWidth={1.5} />
              필요 서류 체크리스트
            </h4>
            <div className="space-y-2">
              {analysis.requiredDocuments.map((doc, i) => (
                <label key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[doc.name] || false}
                    onChange={(e) => setChecklist({ ...checklist, [doc.name]: e.target.checked })}
                    className="w-4 h-4 accent-primary mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-secondary">발급처: {doc.where}</div>
                    {doc.note && <div className="text-xs text-muted">{doc.note}</div>}
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* AI 종합 의견 */}
          <Alert variant="info">
            <h4 className="font-semibold mb-1">AI 종합 의견</h4>
            <p className="leading-relaxed">{analysis.aiOpinion}</p>
          </Alert>

          {/* 전세사기 위험도 */}
          {fraudLoading && <LoadingSpinner message="전세사기 위험도 분석 중..." />}
          {fraudRisk && !fraudLoading && <FraudRiskCard result={fraudRisk} />}

          {/* 보증보험 가입 가능성 */}
          {guaranteeResult && <GuaranteeInsuranceCard result={guaranteeResult} />}

          {/* 임대인 종합 프로파일 */}
          <LandlordTracker ownerName={formData.landlordName} baseAddress={formData.propertyAddress} />

          {/* 문서 자동 생성 */}
          <Card className="p-5">
            <h4 className="font-semibold mb-3">문서 자동 생성</h4>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Button
                icon={FileText}
                loading={docLoading && activeDocType === "jeonse"}
                disabled={docLoading}
                onClick={() => onGenerateDoc("jeonse")}
                className="flex-1"
              >
                전세권설정등기 신청서
              </Button>
              <Button
                variant="amber"
                icon={FileText}
                loading={docLoading && activeDocType === "lease"}
                disabled={docLoading}
                onClick={() => onGenerateDoc("lease")}
                className="flex-1"
              >
                임차권등기명령 신청서
              </Button>
            </div>

            {generatedDoc && (
              <div className="border border-border rounded-lg">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-border rounded-t-lg">
                  <span className="text-sm font-medium">{generatedDoc.title}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onCopy(generatedDoc.content)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-secondary hover:text-primary transition-colors"
                    >
                      <Copy size={14} strokeWidth={1.5} />
                      복사
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
                      className="flex items-center gap-1 px-2 py-1 text-xs text-secondary hover:text-primary transition-colors"
                    >
                      <Download size={14} strokeWidth={1.5} />
                      다운로드
                    </button>
                  </div>
                </div>
                <pre className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-[400px] overflow-y-auto">
                  {generatedDoc.content}
                </pre>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 관련 학술논문 */}
      <div className="mt-6">
        <ScholarPapers keywords={["전세 보증금", "임차인 보호", formData.propertyAddress?.split(" ").slice(0, 2).join(" ") || "부동산"].filter(Boolean)} />
      </div>

      {/* 면책 조항 */}
      <Alert variant="warning" className="mt-6">
        <strong>면책 조항</strong><br />
        본 분석은 공개 데이터 기반의 참고용 정보이며, 법률적 조언이 아닙니다.
        임대인의 재정 상태, 근저당 설정 등 비공개 정보는 반영되지 않을 수 있습니다.
        전세 계약 체결 시 반드시 법무사, 공인중개사 등 전문가와 상담하세요.
      </Alert>

      {/* 연관 분석 CTA */}
      {analysis && !loading && (
        <div className="mt-6 p-4 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7]">
          <p className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider mb-3">이 물건으로 추가 분석</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/rights"
              onClick={() => {
                if (formData.propertyAddress) localStorage.setItem("vestra_last_address", formData.propertyAddress);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
            >
              <Shield size={16} strokeWidth={1.5} />
              권리분석
            </Link>
            <Link
              href="/prediction"
              onClick={() => {
                if (formData.propertyAddress) localStorage.setItem("vestra_last_address", formData.propertyAddress);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e5e7] bg-white text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
            >
              <TrendingUp size={16} strokeWidth={1.5} />
              시세 전망
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
