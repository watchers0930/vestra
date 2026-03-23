import Link from "next/link";
import {
  Shield,
  FileSearch,
  Calculator,
  TrendingUp,
  Home,
  MessageSquare,
  ClipboardCheck,
  CheckCircle,
  ArrowRight,
  Lock,
  BarChart3,
} from "lucide-react";

export const metadata = {
  title: "VESTRA - AI 부동산 자산관리 플랫폼",
  description: "전세사기 예방부터 안전한 매매까지. 등기부등본 권리분석, 전세 안전진단, 계약서 위험 검출, 세금 절세 시뮬레이션을 AI가 처리합니다.",
};

const features = [
  {
    icon: Shield,
    title: "권리분석",
    description: "등기부등본을 AI가 종합 분석하여 권리관계, 위험요소, 안전지수를 한눈에 파악합니다.",
  },
  {
    icon: FileSearch,
    title: "계약서 AI 검토",
    description: "부동산 계약서를 업로드하면 불리한 조항, 누락 사항, 위험 요소를 자동 검출합니다.",
  },
  {
    icon: Calculator,
    title: "세무 시뮬레이션",
    description: "취득세, 양도소득세, 종합부동산세를 실시간으로 계산하고 절세 전략을 제안합니다.",
  },
  {
    icon: TrendingUp,
    title: "시세 전망",
    description: "공공데이터와 AI 분석을 결합하여 부동산 시세 추이와 향후 전망을 제공합니다.",
  },
  {
    icon: Home,
    title: "전세 보호",
    description: "전세 사기 예방을 위한 안전 분석, 전입신고, 확정일자, 전세권설정까지 원스톱 가이드.",
  },
  {
    icon: ClipboardCheck,
    title: "사업성 분석",
    description: "다중 문서 기반으로 사업성을 검증하고 SCR 수준의 분석 보고서를 자동 생성합니다.",
  },
  {
    icon: MessageSquare,
    title: "AI 어시스턴트",
    description: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문하세요. 법률, 세무, 시장 동향까지.",
  },
];

const plans = [
  {
    name: "무료",
    price: "0",
    period: "원/월",
    description: "부동산 분석을 체험해보세요",
    features: ["권리분석 일 5회", "기본 대시보드", "AI 어시스턴트 (제한)"],
    cta: "무료로 시작",
    highlight: false,
  },
  {
    name: "프로",
    price: "50,000",
    period: "원/월",
    description: "전문적인 부동산 분석이 필요한 분",
    features: ["모든 분석 기능", "일 50회 분석", "계약서 AI 검토", "PDF 리포트 다운로드", "AI 어시스턴트 무제한"],
    cta: "프로 시작하기",
    highlight: true,
  },
  {
    name: "비즈니스",
    price: "100,000",
    period: "원/월",
    description: "기업 · 부동산 전문가",
    features: ["프로의 모든 기능", "일 100회 분석", "포트폴리오 관리", "우선 기술 지원", "팀 계정 (준비중)"],
    cta: "비즈니스 시작",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* ================================================================== */}
      {/* Hero Section — Apple style                                         */}
      {/* ================================================================== */}
      <section className="relative overflow-hidden bg-[#fbfbfd]">
        <div className="max-w-[980px] mx-auto px-6 pt-[120px] pb-[80px] md:pt-[160px] md:pb-[100px]">
          <div className="text-center">
            <p className="text-[17px] font-semibold text-primary mb-3">
              AI 기반 부동산 분석 플랫폼
            </p>
            <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-bold text-[#1d1d1f] leading-[1.2] tracking-[-0.06em]">
              보이지 않는 위험까지 감지하는
              <br />
              <span className="bg-gradient-to-r from-primary to-[#2997ff] bg-clip-text text-transparent">
                부동산 자산관리 베스트라
              </span>
            </h1>
            <p className="mt-5 text-[19px] md:text-[21px] text-[#6e6e73] leading-[1.5] max-w-[640px] mx-auto">
              전세사기 예방, 매매 권리분석, 계약서 위험 검출, 절세 시뮬레이션까지.
              <br />
              안전한 부동산 거래를 위한 AI 분석.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-[14px] rounded-full bg-primary text-white text-[17px] font-medium hover:bg-primary/90 transition-colors"
              >
                무료로 시작하기
                <ArrowRight size={18} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-7 py-[14px] rounded-full text-primary text-[17px] font-medium hover:bg-primary/5 transition-colors"
              >
                기능 살펴보기
              </a>
            </div>
            <p className="mt-4 text-xs text-[#86868b]">
              가입 없이도 일 2회 무료 체험 가능
            </p>
          </div>
        </div>

        {/* Subtle radial glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,113,227,0.04)_0%,transparent_70%)] pointer-events-none" />
      </section>

      {/* ================================================================== */}
      {/* Trust Indicators                                                   */}
      {/* ================================================================== */}
      <section className="border-y border-[#d2d2d7] bg-white">
        <div className="max-w-[980px] mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10,000+", label: "분석 완료" },
              { value: "2,500+", label: "가입 회원" },
              { value: "99.2%", label: "분석 정확도" },
              { value: "24/7", label: "AI 상담" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[36px] md:text-[40px] font-bold text-[#1d1d1f] tracking-[-0.02em]">
                  {stat.value}
                </p>
                <p className="text-sm text-[#86868b] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Features Section — Apple tile layout                               */}
      {/* ================================================================== */}
      <section id="features" className="py-[100px] bg-[#fbfbfd]">
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="text-center mb-[60px]">
            <h2 className="text-[40px] md:text-[48px] font-bold text-[#1d1d1f] leading-[1.08] tracking-[-0.03em]">
              하나의 플랫폼에서
              <br />
              모든 부동산 분석을
            </h2>
            <p className="mt-3 text-[21px] text-[#6e6e73]">
              7가지 핵심 기능으로 부동산 의사결정을 돕습니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#f5f5f7] rounded-[20px] p-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] cursor-default"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-5">
                  <f.icon size={28} strokeWidth={1.5} className="text-[#1d1d1f]" />
                </div>
                <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6e6e73] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* How It Works — Step numbers                                        */}
      {/* ================================================================== */}
      <section className="py-[100px] bg-[#f5f5f7]">
        <div className="max-w-[860px] mx-auto px-6">
          <div className="text-center mb-[60px]">
            <h2 className="text-[40px] md:text-[48px] font-bold text-[#1d1d1f] leading-[1.08] tracking-[-0.03em]">
              3단계로 시작하세요
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            {[
              { step: "01", title: "로그인", desc: "Google, 카카오, 네이버로 간편 가입", icon: Lock },
              { step: "02", title: "분석 요청", desc: "주소 입력 또는 문서 업로드", icon: BarChart3 },
              { step: "03", title: "결과 확인", desc: "AI 분석 리포트 즉시 확인 · 다운로드", icon: CheckCircle },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-[56px] font-bold text-primary/20 leading-none mb-4">
                  {s.step}
                </div>
                <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-2">{s.title}</h3>
                <p className="text-sm text-[#6e6e73]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Social Proof / Testimonials                                       */}
      {/* ================================================================== */}
      <section className="py-[80px] bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6">
          <h2 className="text-center text-[32px] md:text-[40px] font-bold text-foreground leading-[1.1] tracking-[-0.03em]">
            전문가들이 신뢰하는 분석
          </h2>
          <p className="text-center mt-3 text-[17px] text-secondary">
            부동산 전문가와 투자자들의 실제 후기
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              { name: "김태호", role: "공인중개사", quote: "전세 안전성 분석이 정확해서 고객 상담 시 신뢰도 높은 데이터를 제공할 수 있게 되었습니다." },
              { name: "이수진", role: "부동산 투자자", quote: "V-Score 기반 통합 위험도 평가 덕분에 투자 의사결정이 훨씬 빨라졌어요." },
              { name: "박준혁", role: "법무법인 변호사", quote: "권리분석 그래프 엔진이 복잡한 등기부등본도 직관적으로 시각화해줍니다." },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-border">
                <p className="text-[15px] text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-secondary">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Pricing Section — highlight card uses #001466                      */}
      {/* ================================================================== */}
      <section id="pricing" className="py-[100px] bg-white">
        <div className="max-w-[960px] mx-auto px-6">
          <div className="text-center mb-[60px]">
            <h2 className="text-[40px] md:text-[48px] font-bold text-[#1d1d1f] leading-[1.08] tracking-[-0.03em]">
              합리적인 요금제
            </h2>
            <p className="mt-3 text-[21px] text-[#6e6e73]">
              필요에 맞는 플랜을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-[20px] p-10 transition-all duration-300 hover:scale-[1.02] ${
                  plan.highlight
                    ? "bg-[#001466] text-white"
                    : "bg-[#f5f5f7]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-[11px] font-semibold tracking-wide">
                    인기
                  </div>
                )}
                <h3 className={`text-2xl font-semibold ${plan.highlight ? "text-white" : "text-[#1d1d1f]"}`}>
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`text-[48px] font-bold tracking-[-0.03em] ${plan.highlight ? "text-white" : "text-[#1d1d1f]"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? "text-white/50" : "text-[#86868b]"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${plan.highlight ? "text-white/60" : "text-[#6e6e73]"}`}>
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-center gap-2 text-sm ${
                        plan.highlight ? "text-white/80" : "text-[#424245]"
                      }`}
                    >
                      <CheckCircle size={16} className="text-primary flex-shrink-0" strokeWidth={1.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-7 block w-full py-[14px] rounded-xl text-[17px] font-medium text-center transition-colors ${
                    plan.highlight
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-[#001466] text-white hover:bg-[#001466]/90"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-[#86868b] mt-8">
            모든 요금제는 부가세 포함 가격입니다. 언제든 해지 가능합니다.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Final CTA — #001466 background                                    */}
      {/* ================================================================== */}
      <section className="py-[100px] bg-[#001466]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-[40px] md:text-[48px] font-bold text-white leading-[1.08] tracking-[-0.03em]">
            지금 바로 시작하세요
          </h2>
          <p className="mt-3 text-[21px] text-white/50">
            가입 없이도 무료로 체험할 수 있습니다
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-8 px-7 py-[14px] rounded-full bg-primary text-white text-[17px] font-medium hover:bg-primary/90 transition-colors"
          >
            무료로 시작하기
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
