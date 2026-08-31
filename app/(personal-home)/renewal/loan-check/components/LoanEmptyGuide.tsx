"use client";

import s from "../loan-check.module.css";

const STEPS = [
  { n: 1, head: "정보 입력", text: "전세 보증금·시세·연소득 등 기본 정보를 입력합니다." },
  { n: 2, head: "은행별 심사", text: "7대 은행의 LTV·DTI·소득 조건으로 동시에 가심사합니다." },
  { n: 3, head: "맞춤 결과", text: "은행별 대출 가능 여부·한도·금리를 한눈에 비교합니다." },
];

const BANKS = ["KB국민", "신한", "하나", "우리", "NH농협", "카카오뱅크", "토스뱅크"];

const TERMS = [
  { label: "LTV", desc: "담보인정비율. 보증금이 주택가격 대비 얼마인지로 대출 한도를 판단합니다." },
  { label: "DTI", desc: "총부채상환비율. 연소득 대비 연간 원리금 상환액 비중을 봅니다." },
  { label: "소득 상한", desc: "버팀목·디딤돌 등 정책 상품은 연소득 기준을 초과하면 대상에서 제외됩니다." },
  { label: "생애최초", desc: "생애최초 주택 구입자는 일부 우대 전용 상품을 이용할 수 있습니다." },
];

export default function LoanEmptyGuide() {
  return (
    <div className={s.guideCard}>
      <p className={s.guideTitle}>왼쪽 정보를 입력하면 바로 결과가 나와요</p>
      <p className={s.guideSub}>가입·신청 없이 무료로 7대 은행 전세대출 조건을 비교할 수 있습니다.</p>

      <div className={s.stepList}>
        {STEPS.map((st) => (
          <div key={st.n} className={s.step}>
            <div className={s.stepNum}>{st.n}</div>
            <p className={s.stepHead}>{st.head}</p>
            <p className={s.stepText}>{st.text}</p>
          </div>
        ))}
      </div>

      <div className={s.guideDivider} />

      <p className={s.bankLabel}>비교 대상 은행</p>
      <div className={s.bankChips}>
        {BANKS.map((b) => (
          <span key={b} className={s.bankChip}><span className={s.bankDot} />{b}</span>
        ))}
      </div>

      <div className={s.guideDivider} />

      <p className={s.bankLabel}>알아두면 좋아요</p>
      <div className={s.termGrid}>
        {TERMS.map((t) => (
          <div key={t.label} className={s.termCard}>
            <p className={s.termLabel}>{t.label}</p>
            <p className={s.termDesc}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
