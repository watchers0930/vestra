"use client";

import Link from "next/link";
import s from "../expert.module.css";

/** 진행 절차 인포그래픽 + 하단 CTA. */
export default function ProcessSection() {
  const scrollToForm = () => {
    document.getElementById("consult-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className={`${s.block} ${s.blockLast}`}>
        <p className={s.secEyebrow}>How It Works</p>
        <h2 className={s.secTitle}>상담 진행 절차</h2>
        <p className={s.secDesc}>
          신청부터 상담 완료까지 3단계로 진행됩니다. AI가 빠르게 1차 분석하고, 전문가가 정밀 검증합니다.
        </p>
        <div className={s.procCard}>
          <div className={s.procFlow}>
            <div className={s.pstep}>
              <div className={`${s.pstepIco} ${s.pi1}`}>
                <svg viewBox="0 0 24 24"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /></svg>
              </div>
              <div className={s.pstepT}>01. 상담 신청 &amp; AI 분석</div>
              <div className={s.pstepD}>상담 분야와 물건 정보를 입력하면<br />AI가 즉시 권리·위험 요소를 분석합니다.</div>
              <span className={`${s.pstepBadge} ${s.pb1}`}>평균 3.2초 소요</span>
            </div>
            <div className={s.procArrow}>→</div>
            <div className={s.pstep}>
              <div className={`${s.pstepIco} ${s.pi2}`}>
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
              </div>
              <div className={s.pstepT}>02. 전문가 매칭 &amp; 검증</div>
              <div className={s.pstepD}>분야에 맞는 검증된 전문가가 배정되어<br />AI 분석 결과를 교차 검증합니다.</div>
              <span className={`${s.pstepBadge} ${s.pb2}`}>24시간 내 매칭</span>
            </div>
            <div className={s.procArrow}>→</div>
            <div className={s.pstep}>
              <div className={`${s.pstepIco} ${s.pi3}`}>
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" /></svg>
              </div>
              <div className={s.pstepT}>03. 1:1 상담 &amp; 보고서</div>
              <div className={s.pstepD}>전화·화상으로 1:1 상담을 진행하고<br />AI+전문가 통합 보고서를 받습니다.</div>
              <span className={`${s.pstepBadge} ${s.pb3}`}>신뢰도 99%+</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={s.ctaSec}>
        <div className={s.ctaIn}>
          <h2 className={s.ctaT}>부동산 고민, 전문가와 함께 해결하세요</h2>
          <p className={s.ctaD}>
            혼자 판단하기 어려운 계약·세금·권리 문제,<br />
            검증된 전문가가 AI 분석 결과를 바탕으로 명확하게 답해드립니다.
          </p>
          <div className={s.ctaBtns}>
            <button className={s.ctaP} onClick={scrollToForm}>지금 상담 신청하기</button>
            <Link href="/renewal/assistant" className={s.ctaO}>AI 어시스턴트 먼저 써보기</Link>
          </div>
          <div className={s.ctaBadges}>
            <span className={s.ctaBadge}>검증된 전문가</span>
            <span className={s.ctaBadge}>24시간 내 매칭</span>
            <span className={s.ctaBadge}>AI 분석 연동</span>
          </div>
        </div>
      </div>
    </>
  );
}
