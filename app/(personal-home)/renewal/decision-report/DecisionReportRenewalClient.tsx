"use client";

import Link from "next/link";
import { FileText, TrendingUp, Shield, Banknote, Lock, ChevronRight } from "lucide-react";
import s from "./decision-report.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { formatKRW } from "@/lib/format";
import { useDecisionReportData } from "@/app/(app)/decision-report/hooks/useDecisionReportData";

const GRADE: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "#dcfce7", text: "#15803d", label: "적극 추천" },
  B: { bg: "#dbeafe", text: "#1d4ed8", label: "추천" },
  C: { bg: "#fef9c3", text: "#a16207", label: "조건부" },
  D: { bg: "#ffedd5", text: "#c2410c", label: "비추천" },
  F: { bg: "#fee2e2", text: "#b91c1c", label: "비추천" },
};

function Hero() {
  return (
    <div className={s.heroWrap}>
      <div className={s.heroInner}>
        <span className={s.heroChip}><FileText size={14} /> 의사결정 통합 리포트</span>
        <h1 className={s.heroTitle}>대출·시세·안전성을<br />한 리포트로</h1>
        <p className={s.heroSub}>전세대출 가심사 결과를 바탕으로 종합 등급과 추천 의견을 정리해 드립니다.</p>
      </div>
    </div>
  );
}

export default function DecisionReportRenewalClient() {
  const { report, loading } = useDecisionReportData();

  return (
    <div className={s.pageShell}>
      <RenewalGnb />
      <Hero />

      <div className={s.mainWrap}>
        {loading && (
          <div className={s.card}>
            <div className={s.centerBox}>
              <div className={s.spinner} />
              <p className={s.emptyText}>의사결정 리포트 생성 중...</p>
            </div>
          </div>
        )}

        {!loading && !report && (
          <div className={s.card}>
            <div className={s.centerBox}>
              <FileText size={44} className={s.emptyIcon} />
              <p className={s.emptyTitle}>아직 생성된 리포트가 없어요</p>
              <p className={s.emptyText}>전세대출 가심사에서 시뮬레이션을 먼저 진행하면 종합 리포트를 만들어 드립니다.</p>
              <Link href="/renewal/loan-check" className={s.emptyBtn}>전세대출 가심사로 이동 <ChevronRight size={16} /></Link>
            </div>
          </div>
        )}

        {!loading && report && (() => {
          const grade = GRADE[report.summary.overallGrade] || GRADE.C;
          const eligible = report.loanSimulation.results.filter((r) => r.isEligible);
          return (
            <>
              {/* 종합 등급 */}
              <div className={s.gradeCard}>
                <div className={s.gradeTop}>
                  <div className={s.gradeBadge} style={{ background: grade.bg, color: grade.text }}>
                    {report.summary.overallGrade}
                  </div>
                  <div>
                    <p className={s.gradeLabel} style={{ color: grade.text }}>{grade.label}</p>
                    <p className={s.gradeRec}>{report.summary.recommendation}</p>
                  </div>
                </div>
                <div className={s.keyPoints}>
                  {report.summary.keyPoints.map((point, i) => (
                    <div key={i} className={s.keyPoint}>
                      <span className={s.keyNum}>{i + 1}</span>
                      <span className={s.keyText}>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 통계 3칸 */}
              <div className={s.statGrid}>
                <div className={s.statCard}>
                  <Banknote size={22} color="#2563eb" />
                  <p className={s.statValue}>{report.summary.loanEligible}개</p>
                  <p className={s.statLabel}>대출 가능 은행</p>
                </div>
                <div className={s.statCard}>
                  <TrendingUp size={22} color="#16a34a" />
                  <p className={s.statValue}>{formatKRW(report.summary.maxLoanAmount)}</p>
                  <p className={s.statLabel}>최대 대출 한도</p>
                </div>
                <div className={s.statCard}>
                  <Shield size={22} color="#3b82f6" />
                  <p className={s.statValue}>{report.summary.lowestRate}%</p>
                  <p className={s.statLabel}>최저 금리</p>
                </div>
              </div>

              {/* 대출 가능 은행 */}
              {eligible.length > 0 && (
                <div className={s.card}>
                  <p className={s.bankListTitle}>대출 가능 은행</p>
                  <div className={s.bankRows}>
                    {eligible.map((r) => (
                      <div key={`${r.bankName}-${r.productName}`} className={s.bankRow}>
                        <div>
                          <p className={s.bankRowName}>{r.bankName} — {r.productName}</p>
                          <p className={s.bankRowRate}>금리 {r.estimatedRate.min}~{r.estimatedRate.max}%</p>
                        </div>
                        <p className={s.bankRowAmount}>{formatKRW(r.maxLoanAmount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 프리미엄 CTA */}
              <div className={s.premiumCard}>
                <div className={s.premiumIcon}><Lock size={20} /></div>
                <p className={s.premiumTitle}>프리미엄 상세 리포트</p>
                <p className={s.premiumDesc}>시세 예측 + 세금 계산 + 보증보험 + 임대인 프로파일 + AI 종합 의견</p>
                <button className={s.premiumBtn}>상세 리포트 구매 (4,900원)</button>
                <p className={s.premiumNote}>결제 시스템 준비 중 — 곧 오픈 예정</p>
              </div>

              <p className={s.footNote}>
                생성일: {new Date(report.generatedAt).toLocaleString("ko-KR")} · 본 리포트는 참고용이며 실제 금융 상품 조건과 다를 수 있습니다
              </p>
            </>
          );
        })()}
      </div>
    </div>
  );
}
