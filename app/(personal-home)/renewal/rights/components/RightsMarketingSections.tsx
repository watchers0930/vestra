import s from "../rights-renewal.module.css";

interface Props {
  /** CTA "무료 분석 시작하기" 클릭 시 입력 폼으로 스크롤 */
  onStart?: () => void;
}

/** 6대 분석 항목 + 4단계 절차 + 하단 CTA. 정적 마케팅 섹션. */
export default function RightsMarketingSections({ onStart }: Props) {
  return (
    <>
      {/* 6대 분석 항목 */}
      <p className={s.secEyebrow}>Analysis Scope</p>
      <h2 className={s.secTitle}>6대 권리분석 항목</h2>
      <p className={s.secDesc}>VESTRA는 등기부등본의 핵심 권리관계를 6가지 항목으로 나누어 AI가 자동 분석합니다.</p>
      <div className={s.cardsGrid}>
        <div className={s.pcard}>
          <div className={s.pcardIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className={s.pcardTitle}>갑구 권리관계 분석</div>
          <div className={s.pcardDesc}>소유권이전 이력, 압류·가압류·예고등기·가처분·가등기 등 소유권 관련 이상 등기를 탐지합니다.</div>
          <span className={`${s.pcardTag} ${s.tagR}`}>핵심 위험 항목</span>
        </div>
        <div className={s.pcard}>
          <div className={s.pcardIcon}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className={s.pcardTitle}>을구 담보권 분석</div>
          <div className={s.pcardDesc}>근저당·전세권·지상권·지역권 등 담보권 현황과 채권최고액을 계산하여 실질 부채를 산정합니다.</div>
          <span className={`${s.pcardTag} ${s.tagC}`}>요주의</span>
        </div>
        <div className={s.pcard}>
          <div className={s.pcardIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className={s.pcardTitle}>소유자 · 매도인 일치 확인</div>
          <div className={s.pcardDesc}>등기부상 소유자와 계약 상대방이 동일인인지 확인합니다. 불일치 시 사기 거래 위험이 높습니다.</div>
          <span className={`${s.pcardTag} ${s.tagR}`}>필수 확인</span>
        </div>
        <div className={s.pcard}>
          <div className={s.pcardIcon}>
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div className={s.pcardTitle}>LTV · 선순위채권 산정</div>
          <div className={s.pcardDesc}>선순위 근저당 총액을 시세 대비로 계산하여 보증금 회수 가능성을 수치화합니다.</div>
          <span className={`${s.pcardTag} ${s.tagC}`}>자동 계산</span>
        </div>
        <div className={s.pcard}>
          <div className={s.pcardIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className={s.pcardTitle}>고위험 등기 집중 탐지</div>
          <div className={s.pcardDesc}>경매개시결정·신탁등기·가등기 등 거래 자체를 위험하게 만드는 등기를 우선 탐지합니다.</div>
          <span className={`${s.pcardTag} ${s.tagR}`}>AI 자동 탐지</span>
        </div>
        <div className={s.pcard}>
          <div className={s.pcardIcon}>
            <svg viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className={s.pcardTitle}>투자 적합성 종합 판단</div>
          <div className={s.pcardDesc}>권리관계 분석 결과를 바탕으로 매수·전세·투자 관점에서의 종합 적합성을 AI가 판단합니다.</div>
          <span className={`${s.pcardTag} ${s.tagS}`}>AI 종합 판정</span>
        </div>
      </div>

      {/* 이용 절차 */}
      <p className={s.secEyebrow}>How It Works</p>
      <h2 className={s.secTitle}>분석은 4단계로 진행됩니다</h2>
      <div className={s.procSteps}>
        <div className={s.pstep}>
          <div className={`${s.pstepN} ${s.pn1}`}>01</div>
          <div className={s.pstepT}>등기부 입력</div>
          <div className={s.pstepD}>주소 조회·파일 업로드·텍스트 붙여넣기 중 편한 방법으로 입력합니다.</div>
        </div>
        <div className={s.pstep}>
          <div className={`${s.pstepN} ${s.pn2}`}>02</div>
          <div className={s.pstepT}>텍스트 추출</div>
          <div className={s.pstepD}>PDF·이미지에서 AI가 등기부 내용을 자동 추출하고 구조화합니다.</div>
        </div>
        <div className={s.pstep}>
          <div className={`${s.pstepN} ${s.pn3}`}>03</div>
          <div className={s.pstepT}>AI 권리 분석</div>
          <div className={s.pstepD}>갑구·을구 권리관계를 6개 항목으로 나누어 위험도를 점수화합니다.</div>
        </div>
        <div className={s.pstep}>
          <div className={`${s.pstepN} ${s.pn4}`}>04</div>
          <div className={s.pstepT}>리포트 제공</div>
          <div className={s.pstepD}>항목별 상세 분석 결과와 AI 권고사항을 리포트로 제공합니다.</div>
        </div>
      </div>

      {/* CTA */}
      <div className={s.ctaSec}>
        <div className={s.ctaIn}>
          <h2 className={s.ctaT}>지금 무료로 권리분석을 시작하세요</h2>
          <p className={s.ctaD}>
            등기부등본 없이 주소만으로도 간이 분석이 가능합니다.<br />
            VESTRA AI가 권리관계 위험 요소를 빠르게 알려드립니다.
          </p>
          <div className={s.ctaBtns}>
            <button className={s.ctaP} onClick={onStart}>무료 분석 시작하기</button>
            <button className={s.ctaO} onClick={onStart}>서비스 소개 보기</button>
          </div>
          <div className={s.ctaBadges}>
            <span className={s.ctaBadge}>무료 이용</span>
            <span className={s.ctaBadge}>회원가입 불필요</span>
          </div>
        </div>
      </div>
    </>
  );
}
