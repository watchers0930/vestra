import Link from "next/link";
import { Shield, FileText, TrendingUp, Home, Bot, Calculator, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { href: string; icon: LucideIcon; label: string; desc: string; color: string; bg: string }[] = [
  { href: "/contract",   icon: FileText,   label: "계약검토",      desc: "위험 조항 자동 분석",   color: "#30d158", bg: "rgba(48,209,88,0.09)" },
  { href: "/prediction", icon: TrendingUp, label: "시세전망",       desc: "AI 시세 예측",          color: "#ff9f0a", bg: "rgba(255,159,10,0.09)" },
  { href: "/jeonse",     icon: Home,       label: "전세보호",       desc: "전세금 위험도 진단",     color: "#ff3b30", bg: "rgba(255,59,48,0.07)" },
  { href: "/assistant",  icon: Bot,        label: "AI 어시스턴트",  desc: "부동산 궁금증 해결",     color: "#0a84ff", bg: "rgba(10,132,255,0.09)" },
  { href: "/tax",        icon: Calculator, label: "세금계산",       desc: "취득세·양도세 계산",     color: "#8250ff", bg: "rgba(130,80,255,0.07)" },
];

const STEPS = [
  { step: "01", title: "주소 입력",  desc: "분석할 부동산 주소를 입력합니다" },
  { step: "02", title: "AI 분석",   desc: "등기·시세·권리관계를 자동 분석합니다" },
  { step: "03", title: "결과 확인", desc: "안전지수·위험 항목을 한눈에 확인합니다" },
];

interface Props {
  userName?: string | null;
}

export function DashboardWelcome({ userName }: Props) {
  return (
    <div className="pt-[52px] pb-20">
      {/* 메인 CTA 카드 */}
      <div
        className="mt-10 mb-6 rounded-[28px] px-8 py-12 sm:px-14 sm:py-14 text-center"
        style={{
          background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ pointerEvents: "none", position: "absolute", top: "-60px", right: "-40px", height: "320px", width: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", bottom: "-60px", left: "80px", height: "200px", width: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(41,151,255,0.10) 0%, transparent 65%)" }} />

        <div className="relative z-[1]">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase mb-5"
            style={{ color: "#2997ff", background: "rgba(41,151,255,0.12)", border: "1px solid rgba(41,151,255,0.20)" }}
          >
            <Shield size={11} strokeWidth={2} />
            AI 부동산 자산관리
          </div>

          <h1
            className="text-white font-bold mb-3 leading-tight"
            style={{ fontSize: "clamp(22px, 3vw, 36px)", letterSpacing: "-0.03em" }}
          >
            {userName ? `${userName.split(" ")[0]}님, ` : ""}첫 번째 분석을 시작해보세요
          </h1>
          <p className="mb-8 text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
            주소를 입력하면 AI가 등기부등본·시세·권리관계를 분석해
            <br className="hidden sm:block" />
            안전 여부를 바로 알려드립니다.
          </p>

          <Link
            href="/rights"
            className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[14px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--brand-primary), #2997ff)", boxShadow: "0 4px 24px rgba(0,113,227,0.42)" }}
          >
            <Shield size={15} strokeWidth={2.2} />
            권리분석 시작하기
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* 3단계 안내 */}
      <div className="mb-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map(({ step, title, desc }) => (
          <div
            key={step}
            className="rounded-[16px] bg-white px-5 py-4 flex sm:flex-col sm:text-center items-start sm:items-center gap-4 sm:gap-2"
            style={{ border: "1px solid rgba(0,0,0,0.07)" }}
          >
            <div className="shrink-0 text-[10px] font-bold tracking-widest text-[#0071e3] sm:mb-1">STEP {step}</div>
            <div>
              <div className="text-[13px] font-bold text-[#1d1d1f] mb-0.5">{title}</div>
              <div className="text-[11.5px] text-[#6e6e73] leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 다른 기능 */}
      <div>
        <div className="mb-3 text-[12px] font-semibold text-[#6e6e73] tracking-wide">이런 것도 할 수 있어요</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[10px]">
          {FEATURES.map(({ href, icon: Icon, label, desc, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-[15px] bg-white px-3 py-4 text-center transition-all hover:-translate-y-[1px] hover:shadow-md"
              style={{ border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]" style={{ background: bg }}>
                <Icon size={17} strokeWidth={1.7} style={{ color }} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#1d1d1f]">{label}</div>
                <div className="text-[10.5px] text-[#6e6e73] mt-0.5 leading-relaxed">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
