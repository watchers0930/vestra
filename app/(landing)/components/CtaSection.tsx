import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-40 bg-[#00042a] text-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-[80px]" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[60px]" />
      <div className="max-w-[1440px] mx-auto px-12 text-center relative z-10">
        <span className="landing-section-label text-white/40 mb-8 block">Get Started</span>
        <h2 className="text-5xl lg:text-6xl font-extrabold mb-8 tracking-tight">
          지금 바로<br />시작하세요
        </h2>
        <p className="text-xl text-white/50 mb-16 max-w-lg mx-auto">
          가입 없이도 무료로 체험할 수 있습니다
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/login"
            className="bg-white text-[#00042a] px-10 py-4 rounded font-extrabold text-[11px] tracking-widest uppercase hover:bg-blue-50 transition-colors"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className="border border-white/30 text-white px-10 py-4 rounded font-bold text-[11px] tracking-widest uppercase hover:bg-white/5 transition-colors"
          >
            데모 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
