import Link from "next/link";
import { VestraLogoMark } from "@/components/common/VestraLogo";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ─── Apple-style Nav ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#fbfbfd]/72 backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-black/[0.04]">
        <div className="max-w-[1024px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <VestraLogoMark size={28} />
            <span
              className="text-[17px] font-bold text-[#1d1d1f] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              VESTRA
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <a
              href="#features"
              className="text-xs text-[#424245] hover:text-[#1d1d1f] transition-colors"
            >
              기능
            </a>
            <a
              href="#pricing"
              className="text-xs text-[#424245] hover:text-[#1d1d1f] transition-colors"
            >
              요금제
            </a>
            <Link
              href="/login"
              className="text-xs text-[#424245] hover:text-[#1d1d1f] transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="text-xs px-4 py-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              무료로 시작
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pt-12">{children}</main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <VestraLogoMark size={24} />
                <span
                  className="font-bold text-[#1d1d1f] tracking-widest text-sm"
                  style={{ fontFamily: "var(--font-sora)" }}
                >
                  VESTRA
                </span>
              </div>
              <p className="text-sm text-[#6e6e73] leading-relaxed">
                AI가 분석하는 부동산 자산관리 플랫폼.
                <br />
                등기부등본 분석부터 시세 전망까지 한 곳에서.
              </p>
              <div className="mt-4 space-y-0.5 text-xs text-[#86868b]">
                <p>BMI C&amp;S | 대표이사 김동의</p>
                <p>사업자등록번호 263-87-03481</p>
                <p>통신판매신고번호 2025-경기광명-0189</p>
                <p>서울특별시 강남구 영동대로85길 34, 901호 (스파크플러스 삼성2호점)</p>
                <p>고객센터 010-8490-9271</p>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 tracking-wide">
                서비스
              </h4>
              <ul className="space-y-2 text-sm text-[#424245]">
                <li>
                  <Link href="/login" className="hover:text-[#1d1d1f] transition-colors">
                    권리분석
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#1d1d1f] transition-colors">
                    계약검토
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#1d1d1f] transition-colors">
                    시세전망
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#1d1d1f] transition-colors">
                    사업성 분석
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-[#1d1d1f] transition-colors">
                    요금제
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-[#1d1d1f] mb-3 tracking-wide">
                약관
              </h4>
              <ul className="space-y-2 text-sm text-[#424245]">
                <li>
                  <Link href="/terms" className="hover:text-[#1d1d1f] transition-colors">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#1d1d1f] transition-colors">
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-[#1d1d1f] transition-colors">
                    법적고지
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-[#d2d2d7] text-center text-xs text-[#86868b]">
            Copyright &copy; 2026 BMI C&amp;S All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
