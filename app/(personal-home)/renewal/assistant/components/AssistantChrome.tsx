import s from "../assistant.module.css";

export function AssistantSubHero() {
  return (
    <section className={s.subHero}>
      <div className={s.subHeroBg} />
      <div className={s.subHeroIn}>
        <span className={s.heroChip}>VESTRA AI Assistant</span>
        <h1>AI 어시스턴트</h1>
        <p className={s.subHeroSub}>부동산 궁금증을 VESTRA AI에게 물어보세요</p>
      </div>
    </section>
  );
}

export function AssistantIntro() {
  return (
    <div className={s.intro}>
      <div className={s.introBadge}>
        <svg viewBox="0 0 24 24"><path d="M12 3a2 2 0 0 1 2 2v1h1a3 3 0 0 1 3 3v1a2 2 0 0 1 0 4v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1a2 2 0 0 1 0-4V9a3 3 0 0 1 3-3h1V5a2 2 0 0 1 2-2z" /><path d="M9.5 12h.01M14.5 12h.01" /><path d="M12 18v3" /></svg>
      </div>
      <div>
        <div className={s.introTitle}>부동산 전문 AI 상담</div>
        <p className={s.introDesc}>
          권리분석·세무·투자·계약·전세보호까지, 부동산에 관한 모든 궁금증을<br />
          하나의 대화 흐름에서 확인하세요. 필요한 순간 VESTRA 분석 기능으로 바로 연결됩니다.
        </p>
      </div>
    </div>
  );
}

export function AssistantLinkBanner() {
  return (
    <div className={s.linkBanner}>
      <div className={s.linkBannerT}>
        <svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
        대화 중 VESTRA 분석 기능으로 바로 연결됩니다
      </div>
      <p className={s.linkBannerD}>
        AI 어시스턴트는 질문 맥락을 파악해 필요한 VESTRA 분석 페이지를 추천하고, 이미 진행한 분석 결과를 참고해 더 정확한 답변을 제공합니다.
      </p>
      <div className={s.linkBannerGrid}>
        <div className={s.lbCard}>
          <div className={s.lbIco}><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
          <div className={s.lbT}>전세보호</div>
          <div className={s.lbD}>안전점수·전세가율 연동</div>
        </div>
        <div className={s.lbCard}>
          <div className={s.lbIco}><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
          <div className={s.lbT}>권리분석</div>
          <div className={s.lbD}>근저당·권리이상 참조</div>
        </div>
        <div className={s.lbCard}>
          <div className={s.lbIco}><svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /></svg></div>
          <div className={s.lbT}>계약검토</div>
          <div className={s.lbD}>특약·독소조항 점검</div>
        </div>
        <div className={s.lbCard}>
          <div className={s.lbIco}><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></div>
          <div className={s.lbT}>세금계산</div>
          <div className={s.lbD}>취득세·보험료 시뮬레이션</div>
        </div>
      </div>
    </div>
  );
}

export function AssistantFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerIn}>
        <div>
          <div className={s.flogo}><div className={s.flogoI}>V</div><span className={s.flogoT}>VESTRA</span></div>
          <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
          <div className={s.fcontact}>
            BMI C&amp;S | 대표이사 김동의<br />
            사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />
            서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />
            고객센터 010-8490-9271
          </div>
        </div>
        <div><p className={s.fcolT}>Legal</p><ul className={s.flinks}><li><a href="#">개인정보처리방침</a></li><li><a href="#">이용약관</a></li></ul></div>
        <div><p className={s.fcolT}>Product</p><ul className={s.flinks}><li><a href="#">기능 소개</a></li><li><a href="#">요금제</a></li></ul></div>
        <div><p className={s.fcolT}>Company</p><ul className={s.flinks}><li><a href="#">회사 소개</a></li><li><a href="#">채용</a></li><li><a href="#">뉴스레터</a></li></ul></div>
        <div><p className={s.fcolT}>Connect</p><ul className={s.flinks}><li><a href="#">LinkedIn</a></li></ul></div>
      </div>
      <div className={s.fbot}><span>© 2026 BMI-C&amp;S All rights reserved.</span><span>The Digital Curator of Real Estate</span></div>
    </footer>
  );
}
