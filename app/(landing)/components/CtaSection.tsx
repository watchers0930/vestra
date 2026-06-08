import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-20 lg:py-40 bg-[#00042a] text-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/5 rounded-full blur-[80px]" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[60px]" />
      <div className="max-w-[1440px] mx-auto px-5 lg:px-12 text-center relative z-10">
        <span className="landing-section-label text-white/40 mb-5 lg:mb-8 block">Get Started</span>
        <h2 className="text-3xl lg:text-5xl xl:text-6xl font-extrabold mb-5 lg:mb-8 tracking-tight">
          지금 바로<br />시작하세요
        </h2>
        <p className="text-lg lg:text-xl text-white/50 mb-10 lg:mb-16 max-w-lg mx-auto">
          로그인 없이 시세지도, 공시가격, 세금계산을 바로 이용하세요
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/price-map"
            className="bg-white text-[#00042a] px-10 py-4 rounded font-extrabold text-[11px] tracking-widest uppercase hover:bg-blue-50 transition-colors"
          >
            시세지도 바로가기
          </Link>
          <Link
            href="/rights"
            className="border border-white/30 text-white px-10 py-4 rounded font-bold text-[11px] tracking-widest uppercase hover:bg-white/5 transition-colors"
          >
            권리분석 무료 체험
          </Link>
        </div>
        <Link
          href="/login"
          className="inline-block mt-8 text-white/40 text-[11px] tracking-widest uppercase hover:text-white/70 transition-colors"
        >
          로그인하여 전체 기능 이용 →
        </Link>
      </div>
    </section>
  );
}
