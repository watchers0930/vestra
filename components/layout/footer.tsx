"use client";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-12">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Company Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-900">BMI C&amp;S</h3>
            <div className="space-y-1 text-xs text-gray-500 leading-relaxed">
              <p>대표이사 김동의</p>
              <p>사업자등록번호 263-87-03481</p>
              <p>통신판매신고번호 2025-경기광명-0189</p>
              <p>서울특별시 강남구 영동대로85길 34, 901호 (스파크플러스 삼성2호점)</p>
              <p>고객센터 010-8490-9271</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs">
            <a
              href="/legal"
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              법적고지
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="/terms"
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              이용약관
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="/privacy"
              className="text-gray-700 font-semibold hover:text-gray-900 transition-colors"
            >
              개인정보처리방침
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Copyright ⓒ 2026 BMI C&amp;S All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
