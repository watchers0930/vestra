"use client";

import Link from "next/link";
import { Banknote, CheckCircle, XCircle, Star, ChevronRight } from "lucide-react";
import s from "./loan-check.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { formatKRW, formatNumber, parseNumber } from "@/lib/format";
import { useLoanCheckData } from "@/app/(app)/loan-check/hooks/useLoanCheckData";

export default function LoanCheckRenewalClient() {
  const { form, update, result, loading, error, selectedBank, toggleBank, handleSubmit } =
    useLoanCheckData();

  return (
    <div className={s.pageShell}>
      <RenewalGnb active="loan-check" />

      <div className={s.pageWrap}>
        {/* 히어로 */}
        <div className={s.hero}>
          <span className={s.heroChip}>
            <Banknote size={14} /> 전세대출 가심사
          </span>
          <h1 className={s.heroTitle}>7대 은행 전세대출, 한 번에 비교</h1>
          <p className={s.heroSub}>보증금·소득 정보를 입력하면 은행별 대출 가능 여부와 한도를 시뮬레이션합니다.</p>
        </div>

        {/* 입력 폼 */}
        <div className={s.card}>
          <h2 className={s.cardTitle}>물건 · 소득 정보</h2>
          <div className={s.grid}>
            <div className={s.field}>
              <label htmlFor="deposit" className={s.fieldLabel}>전세 보증금</label>
              <input id="deposit" type="text" inputMode="numeric" className={s.fieldInput}
                value={formatNumber(form.deposit)}
                onChange={(e) => update("deposit", parseNumber(e.target.value))} />
              <p className={s.fieldHint}>{formatKRW(form.deposit)}</p>
            </div>
            <div className={s.field}>
              <label htmlFor="propertyPrice" className={s.fieldLabel}>매매 시세</label>
              <input id="propertyPrice" type="text" inputMode="numeric" className={s.fieldInput}
                value={formatNumber(form.propertyPrice)}
                onChange={(e) => update("propertyPrice", parseNumber(e.target.value))} />
              <p className={s.fieldHint}>{formatKRW(form.propertyPrice)}</p>
            </div>
            <div className={s.field}>
              <label htmlFor="annualIncome" className={s.fieldLabel}>연소득</label>
              <input id="annualIncome" type="text" inputMode="numeric" className={s.fieldInput}
                value={formatNumber(form.annualIncome)}
                onChange={(e) => update("annualIncome", parseNumber(e.target.value))} />
              <p className={s.fieldHint}>{formatKRW(form.annualIncome)}</p>
            </div>
            <div className={s.field}>
              <label htmlFor="propertyType" className={s.fieldLabel}>물건 유형</label>
              <select id="propertyType" className={s.fieldSelect}
                value={form.propertyType}
                onChange={(e) => update("propertyType", e.target.value)}>
                <option value="아파트">아파트</option>
                <option value="빌라/다세대">빌라/다세대</option>
                <option value="오피스텔">오피스텔</option>
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="existingLoans" className={s.fieldLabel}>기존 대출 잔액</label>
              <input id="existingLoans" type="text" inputMode="numeric" className={s.fieldInput}
                value={formatNumber(form.existingLoans)}
                onChange={(e) => update("existingLoans", parseNumber(e.target.value))} />
            </div>
            <div className={`${s.field} ${s.checkRow}`}>
              <label className={s.checkLabel}>
                <input type="checkbox" className={s.checkbox}
                  checked={form.isFirstHome}
                  onChange={(e) => update("isFirstHome", e.target.checked)} />
                생애최초 주택
              </label>
            </div>
          </div>

          <button className={s.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "시뮬레이션 중..." : "대출 가심사 시작"}
          </button>
        </div>

        {/* 에러 */}
        {error && <div role="alert" className={s.errorBox}>{error}</div>}

        {/* 결과 */}
        {result && (
          <>
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

            <div className={s.bankGrid}>
              {result.results.map((r) => {
                const bankKey = `${r.bankName}-${r.productName}`;
                const isSel = selectedBank === bankKey;
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
        )}
      </div>
    </div>
  );
}
