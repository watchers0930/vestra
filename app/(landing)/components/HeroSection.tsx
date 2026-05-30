"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TICKER_ITEMS } from "../constants";
import { SampleReportModal } from "./SampleReportModal";

export function HeroSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const tickerList = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-8 lg:px-12 bg-[#fbf8ff] overflow-hidden">
        <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-16 lg:gap-24 items-center pt-20 sm:pt-10">

          {/* Left */}
          <div className="z-10">
            <div className="flex items-center gap-3 mb-4 sm:mb-10">
              <div className="landing-accent-line" />
              <span className="landing-section-label">AI-Powered Real Estate Curation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-[48px] lg:text-[55px] xl:text-[65px] font-extrabold text-[#00042a] tracking-tight mb-4 sm:mb-8">
              <span className="block text-base sm:text-xl md:text-2xl lg:text-[30px] font-bold leading-[1.3] mb-1">보이지 않는 위험까지 감지하는</span>
              <span style={{ display: "block", lineHeight: 1.1 }}>부동산 자산관리 플랫폼</span>
              <span style={{ display: "block", fontWeight: 100, fontStyle: "italic", lineHeight: 1.2 }}>베스트라</span>
            </h1>
            <p className="text-[15px] sm:text-lg text-[#454651] max-w-md mb-6 sm:mb-14 leading-relaxed sm:leading-[1.8]">
              VESTRA는 수만 개의 데이터 포인트를 정밀하게 분석하여 전문가의 통찰력을 디지털화합니다.
            </p>

            <div className="mb-5 sm:mb-12 flex flex-wrap gap-2 sm:gap-3">
              <span className="rounded-full border border-[#00042a]/12 bg-white/80 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-[11px] font-bold tracking-[0.12em] sm:tracking-[0.18em] text-[#00042a] uppercase">
                Patent-Based Analysis Engine
              </span>
              <span className="rounded-full border border-[#00042a]/12 bg-white/80 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-[11px] font-bold tracking-[0.12em] sm:tracking-[0.18em] text-[#00042a] uppercase">
                8대 독자 기술 기반
              </span>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 sm:gap-5 mb-8 sm:mb-16">
              <Link
                href="/login"
                className="landing-grad-btn text-white px-7 py-3 sm:px-10 sm:py-4 rounded font-bold text-[11px] tracking-widest uppercase flex items-center gap-2 group"
              >
                지금 분석 시작하기
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                >
                  arrow_forward
                </span>
              </Link>
              <button
                onClick={() => setModalOpen(true)}
                className="text-[#00042a] font-bold text-[10px] sm:text-[11px] tracking-widest uppercase flex items-center gap-2 group relative"
              >
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

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#e4e1e9] border-2 border-white" />
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#efedf4] border-2 border-white" />
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#dee0ff] border-2 border-white" />
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
                <p className="mt-1 text-[10px] font-medium text-[#6d6d78] tracking-wide">
                  특허 출원 기술 구조를 반영한 분석 파이프라인
                </p>
              </div>
            </div>

          </div>

          {/* Right — image */}
          <div className="relative">
            <div className="landing-img-overlay h-[320px] sm:h-[420px] lg:h-[640px] rounded-xl shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80"
                alt="부동산 자산관리 플랫폼"
                width={1200}
                height={640}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-5 px-1 text-[#00042a]">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#6d6d78]">
                Patent Filing
              </p>
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold leading-[1.6]">
                  출원명: 부동산 거래 위험도 산출장치 및 방법
                </p>
                <p className="text-[12px] text-[#454651] leading-[1.6]">
                  출원번호: 10-2026-0085160
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Background orbs */}
        <div className="absolute -right-40 top-20 w-[600px] h-[600px] bg-[#001466]/4 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -left-40 bottom-0 w-[500px] h-[500px] bg-[#4a58a7]/4 rounded-full blur-[100px] pointer-events-none" />
      </section>

      {modalOpen && <SampleReportModal onClose={() => setModalOpen(false)} />}

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
