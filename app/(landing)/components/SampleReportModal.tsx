"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SampleReportHeader } from "../sample-report/components/SampleReportHeader";
import { SampleReportBody } from "../sample-report/components/SampleReportBody";

interface Props {
  onClose: () => void;
}

export function SampleReportModal({ onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative z-10 w-full max-w-[540px] mx-4 my-8 rounded-2xl bg-[#f5f5f7] shadow-2xl overflow-y-auto" style={{ maxHeight: "92vh" }}>
        {/* 모달 헤더 */}
        <div className="sticky top-0 z-20 flex items-center justify-between bg-[#00042a] text-white px-6 py-3">
          <span className="text-[10px] font-bold tracking-widest uppercase">
            ★ AI 심층 분석 리포트 샘플
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 space-y-6">
          <SampleReportHeader />
          <SampleReportBody />

          {/* CTA */}
          <div className="rounded-2xl bg-[#00042a] text-white p-8 text-center">
            <p className="text-xs tracking-widest uppercase text-white/40 mb-2">내 부동산도 분석해보세요</p>
            <h3 className="text-xl font-extrabold mb-2 tracking-tight">이 수준의 분석을 내 매물에 적용하세요</h3>
            <p className="text-white/50 text-sm mb-6">주소만 입력하면 30초 안에 AI 심층 리포트가 생성됩니다</p>
            <Link
              href="/login"
              onClick={onClose}
              className="inline-flex items-center gap-2 bg-white text-[#00042a] px-8 py-3 rounded font-extrabold text-[11px] tracking-widest uppercase hover:bg-white/90 transition-colors"
            >
              무료로 분석 시작하기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
