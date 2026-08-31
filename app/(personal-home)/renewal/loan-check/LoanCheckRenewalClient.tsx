"use client";

import { Banknote, ShieldCheck, Info, Landmark } from "lucide-react";
import s from "./loan-check.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { useLoanCheckData } from "@/app/(app)/loan-check/hooks/useLoanCheckData";
import LoanForm from "./components/LoanForm";
import LoanEmptyGuide from "./components/LoanEmptyGuide";
import LoanResult from "./components/LoanResult";

const NOTICES = [
  { icon: Info, head: "가심사 참고용", text: "실제 대출 심사 결과는 신용평가·서류심사에 따라 달라질 수 있습니다." },
  { icon: ShieldCheck, head: "전세보증보험 연계", text: "대출과 함께 전세보증금 반환보증 가입 여부도 함께 확인하세요." },
  { icon: Landmark, head: "실시간 금리 반영", text: "은행별 금리는 금융감독원 공시 데이터를 기준으로 갱신됩니다." },
];

export default function LoanCheckRenewalClient() {
  const { form, update, result, loading, error, selectedBank, toggleBank, handleSubmit } =
    useLoanCheckData();

  return (
    <div className={s.pageShell}>
      <RenewalGnb active="loan-check" />

      {/* 히어로 */}
      <div className={s.heroWrap}>
        <div className={s.heroInner}>
          <span className={s.heroChip}><Banknote size={14} /> 전세대출 가심사</span>
          <h1 className={s.heroTitle}>7대 은행 전세대출,<br />한 번에 비교하세요</h1>
          <p className={s.heroSub}>보증금과 소득 정보만 입력하면 은행별 대출 가능 여부·한도·금리를 즉시 시뮬레이션합니다.</p>
          <div className={s.heroStats}>
            <div className={s.heroStat}>
              <span className={s.heroStatNum}>7개</span>
              <span className={s.heroStatLabel}>비교 은행</span>
            </div>
            <div className={s.heroStatDiv} />
            <div className={s.heroStat}>
              <span className={s.heroStatNum}>실시간</span>
              <span className={s.heroStatLabel}>FSS 공시 금리</span>
            </div>
            <div className={s.heroStatDiv} />
            <div className={s.heroStat}>
              <span className={s.heroStatNum}>무료</span>
              <span className={s.heroStatLabel}>가입 없이 조회</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 2컬럼 */}
      <div className={s.mainWrap}>
        <div className={s.colForm}>
          <LoanForm form={form} update={update} loading={loading} onSubmit={handleSubmit} />
        </div>

        <div className={s.rightCol}>
          {error && <div role="alert" className={s.errorBox}>{error}</div>}
          {result
            ? <LoanResult result={result} form={form} selectedBank={selectedBank} toggleBank={toggleBank} />
            : !error && <LoanEmptyGuide />}
        </div>
      </div>

      {/* 하단 안내 밴드 */}
      <div className={s.noticeBand}>
        <div className={s.noticeInner}>
          {NOTICES.map((n) => (
            <div key={n.head} className={s.notice}>
              <span className={s.noticeIcon}><n.icon size={17} /></span>
              <p className={s.noticeHead}>{n.head}</p>
              <p className={s.noticeText}>{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
