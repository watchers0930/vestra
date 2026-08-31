"use client";

import Link from "next/link";
import { CheckCircle, XCircle, Star, ChevronRight } from "lucide-react";
import s from "../loan-check.module.css";
import { formatKRW } from "@/lib/format";
import type { SimResponse, LoanForm } from "@/app/(app)/loan-check/hooks/useLoanCheckData";

interface Props {
  result: SimResponse;
  form: LoanForm;
  selectedBank: string | null;
  toggleBank: (key: string) => void;
}

export default function LoanResult({ result, form, selectedBank, toggleBank }: Props) {
  const maxRef = result.summary.maxAvailable || 1;

  return (
    <>
      {/* 요약 */}
      <div className={s.resultHero}>
        <div className={s.resultTop}>
          <div>
            <p className={s.resultLabel}>시뮬레이션 결과</p>
            <p className={s.resultHeadline}>{result.summary.eligibleCount}개 은행에서 대출 가능</p>
          </div>
          <div className={s.statRow}>
            <div className={s.stat}>
              <p className={s.statLabel}>최대 한도</p>
              <p className={`${s.statValue} ${s.statValueBlue}`}>{formatKRW(result.summary.maxAvailable)}</p>
            </div>
            <div className={s.stat}>
              <p className={s.statLabel}>최저 금리</p>
              <p className={`${s.statValue} ${s.statValueGreen}`}>{result.summary.lowestRate}%</p>
            </div>
          </div>
        </div>
        {result.bestOption && (
          <div className={s.bestBox}>
            <Star size={16} color="#eab308" />
            <span>
              <span className={s.bestName}>{result.bestOption.bankName} {result.bestOption.productName}</span>
              {" "}추천 — {result.bestOption.reason}
            </span>
          </div>
        )}
      </div>

      {/* 은행별 카드 */}
      <div className={s.bankGrid}>
        {result.results.map((r) => {
          const bankKey = `${r.bankName}-${r.productName}`;
          const isSel = selectedBank === bankKey;
          const barPct = r.isEligible ? Math.min(100, Math.round((r.maxLoanAmount / maxRef) * 100)) : 0;
          return (
            <button key={bankKey} onClick={() => toggleBank(bankKey)}
              className={`${s.bankCard} ${r.isEligible ? s.bankCardOk : s.bankCardNo} ${isSel ? s.bankCardSel : ""}`}>
              <div className={s.bankHead}>
                <div>
                  <p className={s.bankName}>{r.bankName}</p>
                  <p className={s.bankProduct}>{r.productName}</p>
                </div>
                {r.isEligible
                  ? <CheckCircle size={19} color="#22c55e" />
                  : <XCircle size={19} color="#9ca3af" />}
              </div>

              {r.isEligible ? (
                <div className={s.bankBody}>
                  <div className={s.bankRow}>
                    <span className={s.bankRowLabel}>최대 한도</span>
                    <span className={s.bankRowValue}>{formatKRW(r.maxLoanAmount)}</span>
                  </div>
                  <div className={s.bankBar}><div className={s.bankBarFill} style={{ width: `${barPct}%` }} /></div>
                  <div className={s.bankRow}>
                    <span className={s.bankRowLabel}>금리</span>
                    <span className={s.bankRowRate}>{r.estimatedRate.min}~{r.estimatedRate.max}%</span>
                  </div>
                  <div className={s.bankRow}>
                    <span className={s.bankRowLabel}>LTV / DTI</span>
                    <span className={s.bankRowValue}>{r.ltv}% / {r.dti}%</span>
                  </div>
                </div>
              ) : (
                <div className={s.reasonList}>
                  {r.reasons.map((reason, i) => (
                    <p key={i} className={s.reason}>• {reason}</p>
                  ))}
                </div>
              )}

              {isSel && r.isEligible && (
                <div className={s.reqBox}>
                  <p className={s.reqTitle}>필요 서류</p>
                  {r.requirements.map((req, i) => (
                    <p key={i} className={s.reqItem}>• {req}</p>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 의사결정 리포트 CTA */}
      <div className={s.ctaCard}>
        <div>
          <p className={s.ctaTitle}>더 정확한 의사결정이 필요하다면</p>
          <p className={s.ctaSub}>대출 + 시세예측 + 세금 + 보증보험 + 임대인 프로파일 통합 리포트</p>
        </div>
        <Link className={s.ctaBtn}
          href={`/decision-report?deposit=${form.deposit}&propertyPrice=${form.propertyPrice}&annualIncome=${form.annualIncome}&propertyType=${form.propertyType}&isFirstHome=${form.isFirstHome}`}>
          의사결정 리포트 보기 <ChevronRight size={16} />
        </Link>
      </div>

      <p className={s.disclaimer}>{result.disclaimer}</p>
    </>
  );
}
