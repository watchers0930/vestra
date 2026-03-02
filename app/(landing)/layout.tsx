import Link from "next/link";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Landing Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              V
            </div>
            <span className="text-lg font-bold text-gray-900">VESTRA</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              기능
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              요금제
            </a>
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              요금 비교
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              무료로 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Landing Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">V</div>
                <span className="font-bold text-gray-900">VESTRA</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI가 분석하는 부동산 자산관리 플랫폼.<br />
                등기부등본 분석부터 시세 전망까지 한 곳에서.
              </p>
              <div className="mt-4 space-y-1 text-xs text-gray-400">
                <p>BMI C&amp;S | 대표이사 김동의</p>
                <p>사업자등록번호 263-87-03481</p>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/login" className="hover:text-gray-900 transition-colors">권리분석</Link></li>
                <li><Link href="/login" className="hover:text-gray-900 transition-colors">계약검토</Link></li>
                <li><Link href="/login" className="hover:text-gray-900 transition-colors">시세전망</Link></li>
                <li><Link href="/pricing" className="hover:text-gray-900 transition-colors">요금제</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">약관</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/terms" className="hover:text-gray-900 transition-colors">이용약관</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-900 transition-colors">개인정보처리방침</Link></li>
                <li><Link href="/legal" className="hover:text-gray-900 transition-colors">법적고지</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
            Copyright &copy; 2026 BMI C&amp;S All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
