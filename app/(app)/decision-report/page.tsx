"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, TrendingUp, Shield, Banknote, Lock } from "lucide-react";
import { formatKRW } from "@/lib/format";

interface DecisionSummary {
  overallGrade: string;
  recommendation: string;
  keyPoints: string[];
  loanEligible: number;
  maxLoanAmount: number;
  lowestRate: number;
}

interface LoanResult {
  bankName: string;
  productName: string;
  isEligible: boolean;
  maxLoanAmount: number;
  estimatedRate: { min: number; max: number };
}

interface ReportData {
  summary: DecisionSummary;
  loanSimulation: { results: LoanResult[]; bestOption: { bankName: string; productName: string; reason: string } | null };
  generatedAt: string;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-green-100", text: "text-green-700", label: "적극 추천" },
  B: { bg: "bg-blue-100", text: "text-blue-700", label: "추천" },
  C: { bg: "bg-yellow-100", text: "text-yellow-700", label: "조건부" },
  D: { bg: "bg-orange-100", text: "text-orange-700", label: "비추천" },
  F: { bg: "bg-red-100", text: "text-red-700", label: "비추천" },
};

function DecisionReportContent() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const deposit = searchParams.get("deposit");
    const propertyPrice = searchParams.get("propertyPrice");
    const annualIncome = searchParams.get("annualIncome");

    if (deposit && propertyPrice && annualIncome) {
      generateReport({
        address: searchParams.get("address") || "서울특별시",
        deposit: Number(deposit),
        propertyPrice: Number(propertyPrice),
        propertyType: searchParams.get("propertyType") || "아파트",
        annualIncome: Number(annualIncome),
        isFirstHome: searchParams.get("isFirstHome") === "true",
        transactionType: "JEONSE",
      });
    }
  }, [searchParams]);

  const generateReport = async (input: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/decision-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok) setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">의사결정 리포트 생성 중...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-300" />
        <h2 className="mt-4 text-lg font-bold text-gray-900">의사결정 통합 리포트</h2>
        <p className="mt-2 text-sm text-gray-500">
          대출 가심사 페이지에서 시뮬레이션 후 리포트를 생성하세요
        </p>
        <a href="/loan-check" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          대출 가심사로 이동
        </a>
      </div>
    );
  }

  const grade = GRADE_STYLES[report.summary.overallGrade] || GRADE_STYLES.C;
  const eligible = report.loanSimulation.results.filter((r) => r.isEligible);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">의사결정 통합 리포트</h1>
      </div>

      {/* 종합 등급 */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${grade.bg}`}>
            <span className={`text-3xl font-black ${grade.text}`}>{report.summary.overallGrade}</span>
          </div>
          <div>
            <p className={`text-sm font-bold ${grade.text}`}>{grade.label}</p>
            <p className="text-lg font-bold text-gray-900">{report.summary.recommendation}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {report.summary.keyPoints.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 무료 요약: 대출 현황 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <Banknote className="mx-auto h-6 w-6 text-indigo-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{report.summary.loanEligible}개</p>
          <p className="text-xs text-gray-500">대출 가능 은행</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <TrendingUp className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatKRW(report.summary.maxLoanAmount)}</p>
          <p className="text-xs text-gray-500">최대 대출 한도</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <Shield className="mx-auto h-6 w-6 text-blue-500" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{report.summary.lowestRate}%</p>
          <p className="text-xs text-gray-500">최저 금리</p>
        </div>
      </div>

      {/* 대출 가능 은행 목록 */}
      {eligible.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-900">대출 가능 은행</h3>
          <div className="space-y-2">
            {eligible.map((r) => (
              <div key={`${r.bankName}-${r.productName}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.bankName} — {r.productName}</p>
                  <p className="text-xs text-gray-500">금리 {r.estimatedRate.min}~{r.estimatedRate.max}%</p>
                </div>
                <p className="text-sm font-bold text-indigo-600">{formatKRW(r.maxLoanAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 유료 상세 리포트 CTA */}
      <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-indigo-400" />
        <h3 className="mt-3 text-sm font-bold text-gray-900">프리미엄 상세 리포트</h3>
        <p className="mt-1 text-xs text-gray-500">
          시세 예측 + 세금 계산 + 보증보험 + 임대인 프로파일 + AI 종합 의견
        </p>
        <button className="mt-4 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          상세 리포트 구매 (4,900원)
        </button>
        <p className="mt-2 text-xs text-gray-400">결제 시스템 준비 중 — 곧 오픈 예정</p>
      </div>

      <p className="text-center text-xs text-gray-400">
        생성일: {new Date(report.generatedAt).toLocaleString("ko-KR")} · 본 리포트는 참고용이며 실제 금융 상품 조건과 다를 수 있습니다
      </p>
    </div>
  );
}

export default function DecisionReportPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></div>}>
      <DecisionReportContent />
    </Suspense>
  );
}
