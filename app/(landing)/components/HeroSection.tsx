import Image from "next/image";
import { TICKER_ITEMS } from "../constants";
import { HeroSearchInput } from "./HeroSearchInput";
import { SituationSection } from "./SituationSection";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <div className="bg-[#fbf8ff] overflow-hidden">
      {/* Hero */}
      <section className="relative flex flex-col justify-center px-5 lg:px-12 pt-28 lg:pt-20 pb-10">
        <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center">

          {/* Left */}
          <div style={{ position: "relative", zIndex: 10, marginTop: "100px", marginBottom: "50px" }}>
            <div className="flex items-center gap-3 mb-6 lg:mb-10">
              <div className="landing-accent-line" />
              <span className="landing-section-label">AI-Powered Real Estate Curation</span>
            </div>
            <h1 className="text-[28px] lg:text-[55px] xl:text-[65px] font-extrabold text-[#00042a] tracking-tight mb-5 lg:mb-8">
              <span className="block text-[15px] lg:text-[30px] font-bold leading-[1.3] mb-1">보이지 않는 위험까지 감지하는</span>
              <span className="block leading-[1.1]">부동산 권리분석 플랫폼</span>
              <span className="block font-thin italic leading-[1.2]">베스트라</span>
            </h1>
            <p className="text-xs lg:text-base text-[#454651] max-w-md mb-8 lg:mb-10 leading-[1.8]">
              VESTRA는 수만 개의 데이터 포인트를 정밀하게 분석하여<br />전문가의 통찰력을 디지털화합니다.
            </p>

            <HeroSearchInput />
            <p className="text-[11px] text-[#9e9cb0] mt-3">
              로그인 없이 기본 분석 가능 · 상세 리포트는 회원가입 후 제공
            </p>
          </div>

          {/* Right — image */}
          <div className="relative">
            <div className={`landing-img-overlay rounded-xl shadow-2xl ${styles.heroImgContainer}`}>
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
              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold leading-[1.3]">
                  출원명: 부동산 거래 위험도 산출장치 및 방법
                </p>
                <p className="text-[12px] text-[#454651] leading-[1.3]">
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

      {/* Situation cards — same background */}
      <SituationSection />
    </div>
  );
}
