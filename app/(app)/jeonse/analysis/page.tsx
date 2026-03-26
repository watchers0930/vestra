"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Home, Shield, FileText, CheckCircle, Copy, AlertTriangle, Download, ChevronRight, TrendingUp } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { addAnalysis } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { PageHeader, Card, Alert, Button } from "@/components/common";
import { ScholarPapers } from "@/components/results";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";
import { FormInput, SliderInput, TabButtons } from "@/components/forms";
import { LoadingSpinner } from "@/components/loading";
import FraudRiskCard from "@/components/results/FraudRiskCard";
import { GuaranteeInsuranceCard } from "@/components/results";
import type { FraudRiskResult } from "@/lib/patent-types";
import { checkGuaranteeInsurance } from "@/lib/guarantee-insurance";
import type { GuaranteeInsuranceResult } from "@/lib/guarantee-insurance";
import { useToast } from "@/components/common/toast";
import LandlordTracker from "@/components/landlord/LandlordTracker";

interface JeonseAnalysis {
  needsRegistration: "required" | "recommended" | "optional";
  reason: string;
  riskLevel: "high" | "medium" | "low";
  recommendations: string[];
  requiredDocuments: { name: string; where: string; note: string }[];
  aiOpinion: string;
}

interface GeneratedDocument {
  title: string;
  content: string;
}

const propertyTypes = [
  { value: "아파트", label: "아파트" },
  { value: "빌라/다세대", label: "빌라/다세대" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "단독주택", label: "단독주택" },
];

export default function JeonsePage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    landlordName: "",
    tenantName: "",
    propertyAddress: "",
    deposit: 300000000,
    monthlyRent: 0,
    startDate: "2025-03-01",
    endDate: "2027-02-28",
    propertyType: "아파트",
    propertyPrice: 500000000,
    seniorLiens: 0,
    isMetro: true,
    hasJeonseLoan: false,
  });

  // localStorage에서 주소 프리필
  useEffect(() => {
    const lastAddr = localStorage.getItem("vestra_last_address");
    if (lastAddr) {
      setFormData((prev) => ({ ...prev, propertyAddress: lastAddr }));
      localStorage.removeItem("vestra_last_address");
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<JeonseAnalysis | null>(null);
  const [fraudRisk, setFraudRisk] = useState<FraudRiskResult | null>(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [activeDocType, setActiveDocType] = useState<"jeonse" | "lease">("jeonse");
  const [guaranteeResult, setGuaranteeResult] = useState<GuaranteeInsuranceResult | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    setFraudRisk(null);
    setGuaranteeResult(null);

    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyze", ...formData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);

      // 전세사기 위험도 자동 예측 (병렬)
      setFraudLoading(true);
      fetch("/api/fraud-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 전세가율 추정: 보증금 / 추정 시세 (보증금 기준 80% 추정)
          jeonseRatio: Math.min(100, (formData.deposit / (formData.deposit * 1.25)) * 100),
          isBrokerRegistered: true, // 기본값 (미입력)
          hasDepositInsurance: false,
        }),
      })
        .then((r) => r.json())
        .then((fr) => { if (!fr.error) setFraudRisk(fr); })
        .catch(() => showToast("전세사기 위험도 분석에 실패했습니다."))
        .finally(() => setFraudLoading(false));

      // 보증보험 가입 가능성 판단 (클라이언트 사이드 즉시 계산)
      const gResult = checkGuaranteeInsurance({
        deposit: formData.deposit,
        propertyPrice: formData.propertyPrice,
        seniorLiens: formData.seniorLiens,
        propertyType: formData.propertyType,
        isMetro: formData.isMetro,
        contractStartDate: formData.startDate,
        contractEndDate: formData.endDate,
        hasJeonseLoan: formData.hasJeonseLoan,
      });
      setGuaranteeResult(gResult);

      addAnalysis({
        type: "jeonse",
        typeLabel: "전세보호",
        address: formData.propertyAddress || "미입력",
        summary: `전세권 ${data.needsRegistration === "required" ? "설정 필수" : data.needsRegistration === "recommended" ? "설정 권고" : "선택 사항"}, 위험도 ${data.riskLevel}`,
        data: data as unknown as Record<string, unknown>,
      });

      addNotification("전세 안전 분석 완료");
    } catch {
      showToast("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDoc = async (docType: "jeonse" | "lease") => {
    setDocLoading(true);
    setActiveDocType(docType);
    setGeneratedDoc(null);

    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType, ...formData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedDoc(data);
    } catch {
      showToast("문서 생성 중 오류가 발생했습니다.");
    } finally {
      setDocLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("클립보드에 복사되었습니다.", "success");
  };

  const needsLabel = {
    required: { text: "설정 필수", bg: "bg-red-100", color: "text-red-700" },
    recommended: { text: "설정 권고", bg: "bg-amber-100", color: "text-amber-700" },
    optional: { text: "선택 사항", bg: "bg-emerald-100", color: "text-emerald-700" },
  };

  const riskLabel = {
    high: { text: "고위험", bg: "bg-red-100", color: "text-red-700" },
    medium: { text: "중간", bg: "bg-amber-100", color: "text-amber-700" },
    low: { text: "저위험", bg: "bg-emerald-100", color: "text-emerald-700" },
  };

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm mb-4">
        <Link href="/jeonse" className="text-primary hover:underline">전세보호</Link>
        <ChevronRight size={14} className="text-muted" strokeWidth={1.5} />
        <span className="font-medium">전세 안전 분석</span>
      </nav>
      <PageHeader icon={Shield} title="전세 안전 분석" description="전세권 설정 및 임차권등기명령 AI 분석" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
            계약 정보 입력
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="임대인 (집주인)"
                value={formData.landlordName}
                onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
                placeholder="홍길동"
              />
              <FormInput
                label="임차인 (세입자)"
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                placeholder="김철수"
              />
            </div>

            <FormInput
              label="부동산 주소"
              value={formData.propertyAddress}
              onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
              placeholder="서울 강남구 역삼동 123-45 래미안 101동 1502호"
            />

            <div>
              <label className="block text-sm font-medium mb-1.5">부동산 유형</label>
              <TabButtons
                options={propertyTypes}
                value={formData.propertyType}
                onChange={(v) => setFormData({ ...formData, propertyType: v })}
              />
            </div>

            <SliderInput
              label="보증금"
              value={formData.deposit}
              onChange={(v) => setFormData({ ...formData, deposit: v })}
              min={10000000}
              max={2000000000}
              step={10000000}
            />

            <SliderInput
              label="주택 시세 (매매가)"
              value={formData.propertyPrice}
              onChange={(v) => setFormData({ ...formData, propertyPrice: v })}
              min={100000000}
              max={3000000000}
              step={10000000}
            />

            <SliderInput
              label="선순위 채권액 (근저당 등)"
              value={formData.seniorLiens}
              onChange={(v) => setFormData({ ...formData, seniorLiens: v })}
              min={0}
              max={2000000000}
              step={10000000}
            />

            <div>
              <label className="block text-sm font-medium mb-1.5">지역</label>
              <TabButtons
                options={[
                  { value: "true", label: "수도권" },
                  { value: "false", label: "비수도권" },
                ]}
                value={String(formData.isMetro)}
                onChange={(v) => setFormData({ ...formData, isMetro: v === "true" })}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasJeonseLoan}
                onChange={(e) => setFormData({ ...formData, hasJeonseLoan: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">전세자금대출 연계 (HF 보증 판단용)</span>
            </label>

            <FormInput
              label="월세 (없으면 0)"
              type="number"
              value={formData.monthlyRent}
              onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
              placeholder="0"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="계약 시작일"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              <FormInput
                label="계약 종료일"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <Button
              icon={Shield}
              loading={loading}
              disabled={!formData.propertyAddress}
              fullWidth
              size="lg"
              onClick={handleAnalyze}
            >
              전세 안전 분석
            </Button>
          </div>
        </Card>

        {/* Analysis Result */}
        <div className="space-y-4">
          {loading && (
            <LoadingSpinner message="전세 안전 분석 중..." />
          )}

          {analysis && !loading && (
            <div ref={resultRef}>
              {/* 결과 상단 액션 */}
              <div className="flex items-center justify-between mb-4">
                <AiDisclaimer compact />
                <PdfDownloadButton targetRef={resultRef} filename="vestra-jeonse-analysis.pdf" title="VESTRA 전세분석 리포트" />
              </div>
              {/* Registration Need */}
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

              {/* Recommendations */}
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

              {/* Required Documents Checklist */}
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

              {/* AI Opinion */}
              <Alert variant="info">
                <h4 className="font-semibold mb-1">AI 종합 의견</h4>
                <p className="leading-relaxed">{analysis.aiOpinion}</p>
              </Alert>

              {/* 전세사기 위험도 */}
              {fraudLoading && (
                <LoadingSpinner message="전세사기 위험도 분석 중..." />
              )}
              {fraudRisk && !fraudLoading && (
                <FraudRiskCard result={fraudRisk} />
              )}

              {/* 보증보험 가입 가능성 */}
              {guaranteeResult && (
                <GuaranteeInsuranceCard result={guaranteeResult} />
              )}

              {/* 임대인 종합 프로파일 */}
              {analysis && (
                <LandlordTracker
                  ownerName={formData.landlordName}
                  baseAddress={formData.propertyAddress}
                />
              )}

              {/* Document Generation */}
              <Card className="p-5">
                <h4 className="font-semibold mb-3">문서 자동 생성</h4>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Button
                    icon={FileText}
                    loading={docLoading && activeDocType === "jeonse"}
                    disabled={docLoading}
                    onClick={() => handleGenerateDoc("jeonse")}
                    className="flex-1"
                  >
                    전세권설정등기 신청서
                  </Button>
                  <Button
                    variant="amber"
                    icon={FileText}
                    loading={docLoading && activeDocType === "lease"}
                    disabled={docLoading}
                    onClick={() => handleGenerateDoc("lease")}
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
                          onClick={() => copyToClipboard(generatedDoc.content)}
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
      </div>
    </div>
  );
}
