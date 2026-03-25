"use client";

import { useState } from "react";
import { Banknote, CheckCircle, XCircle, Star, ChevronRight } from "lucide-react";
import Link from "next/link";

interface LoanResult {
  bankName: string;
  productName: string;
  isEligible: boolean;
  maxLoanAmount: number;
  estimatedRate: { min: number; max: number };
  ltv: number;
  dti: number;
  reasons: string[];
  requirements: string[];
}

interface SimResponse {
  results: LoanResult[];
  bestOption: { bankName: string; productName: string; reason: string } | null;
  summary: { eligibleCount: number; maxAvailable: number; lowestRate: number };
  disclaimer: string;
}

import { formatKRW, formatNumber, parseNumber } from "@/lib/format";

export default function LoanCheckPage() {
  const [form, setForm] = useState({
    deposit: 300_000_000,
    propertyPrice: 500_000_000,
    propertyType: "아파트",
    propertyAddress: "",
    annualIncome: 50_000_000,
    creditScore: 700,
    existingLoans: 0,
    isFirstHome: false,
  });
  const [result, setResult] = useState<SimResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loan/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `서버 오류 (${res.status})`);
        return;
      }
      setResult(await res.json());
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  type FormKey = keyof typeof form;
  const update = (key: FormKey, value: typeof form[FormKey]) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">전세대출 가심사</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">7대 은행 전세대출 조건을 한번에 비교합니다</p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">물건 · 소득 정보</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deposit" className="mb-1 block text-xs font-medium text-gray-600">전세 보증금</label>
            <input
              id="deposit"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.deposit)}
              onChange={(e) => update("deposit", parseNumber(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">{formatKRW(form.deposit)}</p>
          </div>
          <div>
            <label htmlFor="propertyPrice" className="mb-1 block text-xs font-medium text-gray-600">매매 시세</label>
            <input
              id="propertyPrice"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.propertyPrice)}
              onChange={(e) => update("propertyPrice", parseNumber(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">{formatKRW(form.propertyPrice)}</p>
          </div>
          <div>
            <label htmlFor="annualIncome" className="mb-1 block text-xs font-medium text-gray-600">연소득</label>
            <input
              id="annualIncome"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.annualIncome)}
              onChange={(e) => update("annualIncome", parseNumber(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">{formatKRW(form.annualIncome)}</p>
          </div>
          <div>
            <label htmlFor="propertyType" className="mb-1 block text-xs font-medium text-gray-600">물건 유형</label>
            <select
              id="propertyType"
              value={form.propertyType}
              onChange={(e) => update("propertyType", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="아파트">아파트</option>
              <option value="빌라/다세대">빌라/다세대</option>
              <option value="오피스텔">오피스텔</option>
            </select>
          </div>
          <div>
            <label htmlFor="existingLoans" className="mb-1 block text-xs font-medium text-gray-600">기존 대출 잔액</label>
            <input
              id="existingLoans"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.existingLoans)}
              onChange={(e) => update("existingLoans", parseNumber(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.isFirstHome}
                onChange={(e) => update("isFirstHome", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">생애최초 주택</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {loading ? "시뮬레이션 중..." : "대출 가심사 시작"}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <>
          {/* 요약 */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">시뮬레이션 결과</p>
                <p className="text-lg font-bold text-gray-900">
                  {result.summary.eligibleCount}개 은행에서 대출 가능
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">최대 한도</p>
                  <p className="text-lg font-bold text-indigo-600">{formatKRW(result.summary.maxAvailable)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">최저 금리</p>
                  <p className="text-lg font-bold text-green-600">{result.summary.lowestRate}%</p>
                </div>
              </div>
            </div>

            {result.bestOption && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/80 p-3">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  <span className="font-semibold">{result.bestOption.bankName} {result.bestOption.productName}</span>
                  {" "}추천 — {result.bestOption.reason}
                </span>
              </div>
            )}
          </div>

          {/* 은행별 결과 카드 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.results.map((r) => (
              <button
                key={`${r.bankName}-${r.productName}`}
                onClick={() => setSelectedBank(selectedBank === `${r.bankName}-${r.productName}` ? null : `${r.bankName}-${r.productName}`)}
                className={`rounded-xl border p-4 text-left transition ${
                  r.isEligible
                    ? "border-green-200 bg-white hover:border-green-400"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                } ${selectedBank === `${r.bankName}-${r.productName}` ? "ring-2 ring-indigo-500" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.bankName}</p>
                    <p className="text-xs text-gray-500">{r.productName}</p>
                  </div>
                  {r.isEligible ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {r.isEligible ? (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">최대 한도</span>
                      <span className="font-bold">{formatKRW(r.maxLoanAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">금리</span>
                      <span className="font-semibold text-green-600">{r.estimatedRate.min}~{r.estimatedRate.max}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">LTV / DTI</span>
                      <span>{r.ltv}% / {r.dti}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    {r.reasons.map((reason, i) => (
                      <p key={i} className="text-xs text-red-500">• {reason}</p>
                    ))}
                  </div>
                )}

                {/* 상세 (선택 시) */}
                {selectedBank === `${r.bankName}-${r.productName}` && r.isEligible && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">필요 서류</p>
                    {r.requirements.map((req, i) => (
                      <p key={i} className="text-xs text-gray-500">• {req}</p>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* 의사결정 리포트 CTA */}
          <div className="rounded-xl border border-indigo-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">더 정확한 의사결정이 필요하다면</p>
                <p className="text-xs text-gray-500">대출 + 시세예측 + 세금 + 보증보험 + 임대인 프로파일 통합 리포트</p>
              </div>
              <Link
                href={`/decision-report?deposit=${form.deposit}&propertyPrice=${form.propertyPrice}&annualIncome=${form.annualIncome}&propertyType=${form.propertyType}&isFirstHome=${form.isFirstHome}`}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                의사결정 리포트 보기 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">{result.disclaimer}</p>
        </>
      )}
    </div>
  );
}
