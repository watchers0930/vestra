import Link from "next/link";
import { SampleReportHeader } from "./components/SampleReportHeader";
import { SampleReportBody } from "./components/SampleReportBody";

export const metadata = {
  title: "심층 분석 리포트 샘플 — VESTRA",
  description: "VESTRA AI가 생성한 부동산 심층 분석 리포트 샘플입니다.",
};

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* 샘플 배너 */}
      <div className="bg-[#00042a] text-white text-center py-2.5 text-xs tracking-widest uppercase font-bold">
        ★ 이것은 AI가 생성한 샘플 리포트입니다 — 실제 분석을 원하시면&nbsp;
        <Link href="/login" className="underline underline-offset-2 hover:text-white/70 transition-colors">
          무료로 시작하세요
        </Link>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-12">
        <SampleReportHeader />
        <SampleReportBody />

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-[#00042a] text-white p-10 text-center">
          <p className="text-xs tracking-widest uppercase text-white/40 mb-3">내 부동산도 분석해보세요</p>
          <h3 className="text-2xl font-extrabold mb-2 tracking-tight">이 수준의 분석을 내 매물에 적용하세요</h3>
          <p className="text-white/50 text-sm mb-8">주소만 입력하면 30초 안에 AI 심층 리포트가 생성됩니다</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-[#00042a] px-8 py-3.5 rounded font-extrabold text-[11px] tracking-widest uppercase hover:bg-white/90 transition-colors"
          >
            무료로 분석 시작하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
