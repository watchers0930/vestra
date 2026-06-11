"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

type Tier = "OPEN" | "TRIAL" | "AUTH_REQUIRED";

const FEATURES_DATA: { icon: string; label: string; title: string; desc: string; href: string; tier: Tier }[] = [
  {
    icon: "gavel",
    label: "Rights Analysis",
    title: "권리 분석",
    desc: "등기부등본을 AI가 종합 분석하여 권리관계, 위험요소, 안전지수를 한눈에 파악합니다.",
    href: "/rights",
    tier: "TRIAL",
  },
  {
    icon: "query_stats",
    label: "Market Prediction",
    title: "시세 전망",
    desc: "공공데이터와 AI 분석을 결합하여 부동산 시세 추이와 향후 전망을 제공합니다.",
    href: "/prediction",
    tier: "TRIAL",
  },
  {
    icon: "shield",
    label: "Tenant Protection",
    title: "전세 보호",
    desc: "전세 사기 예방을 위한 안전 분석, 전입신고, 확정일자, 전세권설정까지 원스톱 가이드.",
    href: "/jeonse/analysis",
    tier: "TRIAL",
  },
  {
    icon: "verified_user",
    label: "Registry Guard",
    title: "등기부 AI 보호",
    desc: "인공지능이 하루 2회 등기부등본의 변경사항을 자동으로 확인합니다. 소유권 이전, 근저당 설정 등 이상 징후 발견 시 즉시 알려드려 당신의 부동산을 지켜드립니다.",
    href: "/registry",
    tier: "AUTH_REQUIRED",
  },
  {
    icon: "contract",
    label: "Contract Review",
    title: "계약서 AI 검토",
    desc: "부동산 계약서를 업로드하면 불리한 조항, 누락 사항, 위험 요소를 자동 검출합니다.",
    href: "/contract",
    tier: "AUTH_REQUIRED",
  },
  {
    icon: "calculate",
    label: "Tax Simulation",
    title: "세무 시뮬레이션",
    desc: "취득세, 양도소득세, 종합부동산세를 실시간으로 계산하고 절세 전략을 제안합니다.",
    href: "/tax",
    tier: "OPEN",
  },
  {
    icon: "analytics",
    label: "Business Analysis",
    title: "사업성 분석",
    desc: "다중 문서 기반으로 사업성을 검증하고 SCR 수준의 분석 보고서를 자동 생성합니다.",
    href: "/feasibility",
    tier: "AUTH_REQUIRED",
  },
  {
    icon: "smart_toy",
    label: "AI Assistant",
    title: "AI 어시스턴트",
    desc: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문하세요. 법률, 세무, 시장 동향까지.",
    href: "/assistant",
    tier: "AUTH_REQUIRED",
  },
];

const iconStyle = { fontVariationSettings: "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24" };

export function FeaturesSection() {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? FEATURES_DATA : FEATURES_DATA.slice(0, 6);

  return (
    <section id="features" className="py-16 px-5 lg:py-40 lg:px-12 bg-[#fbf8ff]">
      <div className="max-w-[1440px] mx-auto">

        {/* Header */}
        <ScrollReveal className="flex items-end justify-between mb-10 lg:mb-24">
          <div>
            <div className="flex items-center gap-3 mb-4 lg:mb-5">
              <div className="landing-accent-line" />
              <span className="landing-section-label">Core Services</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-[#00042a] leading-tight tracking-tight">
              전문가의 시각을<br />AI로 구현했습니다
            </h2>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-[#454651] tracking-widest uppercase hover:text-[#00042a] transition-colors group"
          >
            {expanded ? "간략히 보기" : "전체 서비스 보기"}
            <span
              className={`material-symbols-outlined text-sm transition-transform ${
                expanded ? "rotate-90 group-hover:-translate-x-1" : "group-hover:translate-x-1"
              }`}
              style={iconStyle}
            >
              arrow_forward
            </span>
          </button>
        </ScrollReveal>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visible.map((f, i) => (
            <ScrollReveal key={f.title} delay={(i + 1) * 0.1}>
              <div className="landing-feature-card rounded-xl p-6 lg:p-10 bg-white cursor-default h-full relative">

                {/* Tier 배지 */}
                {f.tier === "OPEN" && (
                  <span className="absolute top-4 right-4 lg:top-6 lg:right-6 text-[9px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 tracking-wide">FREE</span>
                )}
                {f.tier === "TRIAL" && (
                  <span className="absolute top-4 right-4 lg:top-6 lg:right-6 text-[9px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 tracking-wide">무료 체험</span>
                )}

                {/* Icon */}
                <div className="w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center bg-[#f5f2fa] rounded-xl mb-5 lg:mb-8">
                  <span className="material-symbols-outlined text-2xl text-[#00042a]" style={iconStyle}>
                    {f.icon}
                  </span>
                </div>

                {/* Label */}
                <span className="landing-section-label block mb-3">{f.label}</span>

                {/* Title */}
                <h3 className="text-xl font-extrabold text-[#00042a] mb-4 tracking-tight">{f.title}</h3>

                {/* Description */}
                <p className="text-[#454651] font-normal leading-[1.8] text-[15px]">{f.desc}</p>

                {/* Link */}
                <Link href={f.href} className="mt-5 lg:mt-8 flex items-center gap-2 text-[#00042a] font-bold text-[11px] tracking-widest uppercase group">
                  {f.tier === "OPEN" ? "바로 사용하기" : f.tier === "TRIAL" ? "무료 체험하기" : "자세히 보기"}
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform" style={iconStyle}>
                    arrow_forward
                  </span>
                </Link>

              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile expand button */}
        <div className="flex lg:hidden justify-center mt-10">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-[11px] font-bold text-[#454651] tracking-widest uppercase hover:text-[#00042a] transition-colors"
          >
            {expanded ? "간략히 보기" : "전체 서비스 보기"}
            <span className="material-symbols-outlined text-sm" style={iconStyle}>
              {expanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>

      </div>
    </section>
  );
}
