import Link from "next/link";
import {
  Shield,
  FileSearch,
  Calculator,
  TrendingUp,
  Home,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Zap,
  Lock,
  BarChart3,
} from "lucide-react";

export const metadata = {
  title: "VESTRA - AI 부동산 자산관리 플랫폼",
  description: "AI가 분석하는 부동산 자산관리. 등기부등본 분석, 계약서 검토, 세무 시뮬레이션, 시세 전망까지 한 곳에서.",
};

const features = [
  {
    icon: Shield,
    title: "권리분석",
    description: "등기부등본을 AI가 종합 분석하여 권리관계, 위험요소, 안전지수를 한눈에 파악합니다.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: FileSearch,
    title: "계약서 AI 검토",
    description: "부동산 계약서를 업로드하면 불리한 조항, 누락 사항, 위험 요소를 자동 검출합니다.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Calculator,
    title: "세무 시뮬레이션",
    description: "취득세, 양도소득세, 종합부동산세를 실시간으로 계산하고 절세 전략을 제안합니다.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "시세 전망",
    description: "공공데이터와 AI 분석을 결합하여 부동산 시세 추이와 향후 전망을 제공합니다.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Home,
    title: "전세 보호",
    description: "전세 사기 예방을 위한 안전 분석, 전입신고, 확정일자, 전세권설정까지 원스톱 가이드.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: MessageSquare,
    title: "AI 어시스턴트",
    description: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문하세요. 법률, 세무, 시장 동향까지.",
    color: "bg-indigo-50 text-indigo-600",
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
      {/* Hero Section                                                       */}
      {/* ================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Zap size={14} />
              AI 기반 부동산 분석 플랫폼
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              AI가 분석하는<br />
              <span className="text-primary">부동산 자산관리</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              등기부등본 분석, 계약서 검토, 세무 시뮬레이션, 시세 전망까지.<br />
              복잡한 부동산 분석을 AI가 빠르고 정확하게 처리합니다.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                무료로 시작하기
                <ArrowRight size={18} />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-center"
              >
                기능 살펴보기
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              가입 없이도 일 2회 무료 체험 가능
            </p>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </section>

      {/* ================================================================== */}
      {/* Trust Indicators                                                   */}
      {/* ================================================================== */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "10,000+", label: "분석 완료" },
              { value: "2,500+", label: "가입 회원" },
              { value: "99.2%", label: "분석 정확도" },
              { value: "24/7", label: "AI 상담" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Features Section                                                   */}
      {/* ================================================================== */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              하나의 플랫폼에서<br />모든 부동산 분석을
            </h2>
            <p className="mt-4 text-gray-600">
              6가지 핵심 기능으로 부동산 의사결정을 돕습니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* How It Works                                                       */}
      {/* ================================================================== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              3단계로 시작하세요
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "로그인", desc: "Google, 카카오, 네이버로 간편 가입", icon: Lock },
              { step: "02", title: "분석 요청", desc: "주소 입력 또는 문서 업로드", icon: BarChart3 },
              { step: "03", title: "결과 확인", desc: "AI 분석 리포트 즉시 확인 · 다운로드", icon: CheckCircle },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <s.icon size={28} />
                </div>
                <div className="text-xs font-bold text-primary mb-2">STEP {s.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Pricing Section                                                    */}
      {/* ================================================================== */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              합리적인 요금제
            </h2>
            <p className="mt-4 text-gray-600">
              필요에 맞는 플랜을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl border-2 transition-all ${
                  plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-xs font-medium">
                    인기
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-6 block w-full py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                    plan.highlight
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            모든 요금제는 부가세 포함 가격입니다. 언제든 해지 가능합니다.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Final CTA                                                          */}
      {/* ================================================================== */}
      <section className="py-20 bg-gradient-to-br from-primary to-indigo-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            지금 바로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-white/80">
            가입 없이도 무료로 체험할 수 있습니다
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 rounded-xl bg-white text-primary font-medium hover:bg-gray-50 transition-colors"
          >
            무료로 시작하기
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
