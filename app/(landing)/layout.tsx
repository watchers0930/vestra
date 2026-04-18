import Link from "next/link";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ─── Glass Nav ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 landing-glass-nav">
        <div className="max-w-[1440px] mx-auto px-12 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-thin tracking-[0.25em] text-[#00042a]">
            VESTRA
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="landing-ghost-btn text-[11px] font-bold tracking-widest uppercase px-6 py-2.5 rounded"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="landing-grad-btn text-white text-[11px] font-bold tracking-widest uppercase px-7 py-2.5 rounded"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16">{children}</main>

      {/* ─── Dark Footer ─── */}
      <footer className="bg-[#00042a] text-white px-12 py-20">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-16 mb-16">
            {/* Company */}
            <div className="max-w-xs">
              <div className="text-2xl font-thin tracking-[0.25em] mb-6 text-white">VESTRA</div>
              <p className="text-white/40 text-sm leading-relaxed">
                The Digital Curator of Real Estate.<br />AI 기반 부동산 자산관리 플랫폼.
              </p>
              <div className="mt-5 space-y-0.5 text-xs text-white/30">
                <p>BMI C&amp;S | 대표이사 김동의</p>
                <p>사업자등록번호 263-87-03481</p>
                <p>통신판매신고번호 2025-경기광명-0189</p>
                <p>서울특별시 강남구 영동대로85길 34, 901호</p>
                <p>고객센터 010-8490-9271</p>
              </div>
            </div>
            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-6">Legal</h5>
                <ul className="space-y-3">
                  <li><Link href="/privacy" className="text-white/60 text-sm hover:text-white transition-colors">개인정보 처리방침</Link></li>
                  <li><Link href="/terms" className="text-white/60 text-sm hover:text-white transition-colors">이용약관</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-6">Product</h5>
                <ul className="space-y-3">
                  <li><Link href="/login" className="text-white/60 text-sm hover:text-white transition-colors">기능 소개</Link></li>
                  <li><Link href="/login" className="text-white/60 text-sm hover:text-white transition-colors">요금제</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-6">Company</h5>
                <ul className="space-y-3">
                  <li><Link href="/login" className="text-white/60 text-sm hover:text-white transition-colors">회사 소개</Link></li>
                  <li><Link href="/login" className="text-white/60 text-sm hover:text-white transition-colors">채용</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-6">Connect</h5>
                <ul className="space-y-3">
                  <li><a href="#" className="text-white/60 text-sm hover:text-white transition-colors">LinkedIn</a></li>
                  <li><a href="#" className="text-white/60 text-sm hover:text-white transition-colors">뉴스레터</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs tracking-widest">© 2026 BMI C&amp;S All rights reserved.</p>
            <p className="text-white/20 text-xs">The Digital Curator of Real Estate</p>
          </div>
        </div>
      </footer>
    </>
  );
}
