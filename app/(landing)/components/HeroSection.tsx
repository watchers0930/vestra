"use client";
import Link from "next/link";
import { TICKER_ITEMS } from "../constants";

export function HeroSection() {
  const tickerList = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center px-12 bg-[#fbf8ff] overflow-hidden">
        <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-24 items-center pt-10">

          {/* Left */}
          <div className="z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="landing-accent-line" />
              <span className="landing-section-label">AI-Powered Real Estate Curation</span>
            </div>
            <h1 className="text-[55px] lg:text-[65px] font-extrabold text-[#00042a] leading-[1.05] tracking-tight mb-8">
              <span style={{ display: "block", fontSize: "30px", fontWeight: 700 }}>보이지 않는 위험까지 감지하는</span>
              <span style={{ display: "block" }}>부동산 자산관리 플랫폼</span>
              <span style={{ display: "block", fontWeight: 100, fontStyle: "italic" }}>베스트라</span>
            </h1>
            <p className="text-lg text-[#454651] max-w-md mb-14 leading-[1.8]">
              VESTRA는 수만 개의 데이터 포인트를 정밀하게 분석하여<br />전문가의 통찰력을 디지털화합니다.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-5 mb-16">
              <Link
                href="/login"
                className="landing-grad-btn text-white px-10 py-4 rounded font-bold text-[11px] tracking-widest uppercase flex items-center gap-2 group"
              >
                지금 분석 시작하기
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                >
                  arrow_forward
                </span>
              </Link>
              <button className="text-[#00042a] font-bold text-[11px] tracking-widest uppercase flex items-center gap-2 group relative">
                <span className="border-b border-[#00042a]/30 pb-0.5 group-hover:border-[#00042a] transition-colors">
                  심층 보고서 샘플 보기
                </span>
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                >
                  arrow_outward
                </span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#e4e1e9] border-2 border-white" />
                <div className="w-8 h-8 rounded-full bg-[#efedf4] border-2 border-white" />
                <div className="w-8 h-8 rounded-full bg-[#dee0ff] border-2 border-white" />
              </div>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {Array(5).fill(0).map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-xs text-amber-400"
                      style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-[#454651] tracking-wider">12,400+ 분석 완료</p>
              </div>
            </div>
          </div>

          {/* Right — image */}
          <div className="relative">
            <div className="landing-img-overlay h-[640px] rounded-xl shadow-2xl">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9Ds1VLz-muSfe0j-s3osxXzmAjPV2zc4o6z0N_phqGuQS7TUCzFOxi7OVBVNGEB3XRWryeeOzSpMubi2-vbU3dtSW6KKOoejcUfJvHHHNh3OKiMpfrBC4UEduXQlRvtYDaKdejAwh8OUcIEJfC_NLed0iHs8t7nXzVVWECIwec4cfybC8bvEfcC3ileDZdiXW65hxhFiSvW4go-kBNAUQohp8QArZcG-tS9QaoUSccOZEsP_EqtanJDsZxpq6iZ-kzjQgeXHNsA"
                alt="부동산 자산관리 플랫폼"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Background orbs */}
        <div className="absolute -right-40 top-20 w-[600px] h-[600px] bg-[#001466]/4 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -left-40 bottom-0 w-[500px] h-[500px] bg-[#4a58a7]/4 rounded-full blur-[100px] pointer-events-none" />
      </section>

      {/* Ticker */}
      <div className="bg-[#00042a] py-4 overflow-hidden">
        <div className="landing-ticker-inner">
          <div className="flex items-center gap-12 px-6" style={{ whiteSpace: "nowrap" }}>
            {tickerList.map((item, i) => (
              <span key={i} className="flex items-center gap-4">
                <span className="text-white/40 font-bold text-[10px] tracking-widest uppercase">★</span>
                <span className="text-white font-bold text-[11px] tracking-widest uppercase">{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
