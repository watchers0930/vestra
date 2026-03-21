"use client";

import { useState, useEffect } from "react";
import { Shield, TrendingUp, Home, Calculator, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vestra_onboarded";

const features = [
  {
    icon: Shield,
    title: "권리분석",
    description: "등기부등본 AI 분석으로 권리관계를 한눈에 파악합니다",
  },
  {
    icon: TrendingUp,
    title: "시세전망",
    description: "실거래가 데이터 기반 시세 추이와 향후 전망을 제공합니다",
  },
  {
    icon: Home,
    title: "전세안전",
    description: "전세 보증금 안전 진단과 보호 절차를 안내합니다",
  },
  {
    icon: Calculator,
    title: "세무시뮬레이션",
    description: "취득세·양도세 등 부동산 세금을 시나리오별로 계산합니다",
  },
];

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl border border-[#e5e5e7] shadow-[0_24px_80px_rgba(0,0,0,0.12)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="VESTRA 온보딩"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
          aria-label="닫기"
        >
          <X size={18} strokeWidth={1.5} className="text-[#6e6e73]" />
        </button>

        <div className="p-8">
          {/* Step 1: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#1d1d1f] flex items-center justify-center">
                <span className="text-white text-2xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>V</span>
              </div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] mb-2">
                VESTRA에 오신 것을 환영합니다
              </h2>
              <p className="text-sm text-[#6e6e73] leading-relaxed">
                AI 기반 부동산 분석 플랫폼으로,
                <br />
                등기부등본 분석부터 시세전망까지
                <br />
                부동산 의사결정에 필요한 모든 인사이트를 제공합니다.
              </p>
            </div>
          )}

          {/* Step 2: Features */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] mb-1 text-center">
                주요 기능 소개
              </h2>
              <p className="text-sm text-[#6e6e73] mb-6 text-center">
                핵심 분석 도구를 소개합니다
              </p>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex items-start gap-3 p-3 rounded-xl border border-[#e5e5e7] bg-[#fafafa]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1d1d1f] flex items-center justify-center flex-shrink-0">
                      <feature.icon size={18} strokeWidth={1.5} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">{feature.title}</p>
                      <p className="text-xs text-[#6e6e73] mt-0.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: CTA */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#f5f5f7] flex items-center justify-center">
                <ArrowRight size={28} strokeWidth={1.5} className="text-[#1d1d1f]" />
              </div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] mb-2">
                지금 시작하세요
              </h2>
              <p className="text-sm text-[#6e6e73] leading-relaxed">
                등기부등본을 업로드하거나 주소를 입력하면
                <br />
                AI가 즉시 분석을 시작합니다.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  step === i ? "bg-[#1d1d1f]" : "bg-[#e5e5e7]"
                )}
              />
            ))}
          </div>

          {/* Button */}
          <button
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#1d1d1f]/90 transition-colors flex items-center gap-2"
          >
            {step < 2 ? "다음" : "시작하기"}
            {step < 2 && <ArrowRight size={14} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </div>
  );
}
