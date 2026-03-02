import Link from "next/link";
import { CheckCircle, XCircle, ArrowRight, Sparkles } from "lucide-react";

export const metadata = {
  title: "요금제",
  description: "VESTRA 요금제를 비교하고 나에게 맞는 플랜을 선택하세요.",
};

interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}

const features: PlanFeature[] = [
  { name: "권리분석 (등기부등본)", free: true, pro: true, business: true },
  { name: "계약서 AI 검토", free: false, pro: true, business: true },
  { name: "세무 시뮬레이션", free: false, pro: true, business: true },
  { name: "시세 전망 분석", free: false, pro: true, business: true },
  { name: "전세 보호 (안전분석)", free: false, pro: true, business: true },
  { name: "AI 어시스턴트", free: "제한", pro: "무제한", business: "무제한" },
  { name: "일일 분석 횟수", free: "5회", pro: "50회", business: "100회" },
  { name: "PDF 리포트 다운로드", free: false, pro: true, business: true },
  { name: "포트폴리오 관리", free: false, pro: false, business: true },
  { name: "우선 기술 지원", free: false, pro: false, business: true },
  { name: "팀 계정", free: false, pro: false, business: "준비중" },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-gray-700 font-medium">{value}</span>;
  }
  return value ? (
    <CheckCircle size={18} className="text-primary mx-auto" />
  ) : (
    <XCircle size={18} className="text-gray-300 mx-auto" />
  );
}

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Sparkles size={14} />
          합리적인 가격
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          요금제 비교
        </h1>
        <p className="mt-4 text-gray-600 max-w-xl mx-auto">
          무료로 시작하고, 필요에 따라 업그레이드하세요.<br />
          모든 유료 요금제는 부가세 포함입니다.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {/* Free */}
        <div className="p-6 rounded-2xl border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">무료</h3>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">0</span>
            <span className="text-sm text-gray-500">원/월</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">부동산 분석을 체험해보세요</p>
          <Link
            href="/login"
            className="mt-6 block w-full py-2.5 rounded-lg text-sm font-medium text-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            무료로 시작
          </Link>
        </div>

        {/* Pro */}
        <div className="relative p-6 rounded-2xl border-2 border-primary shadow-lg shadow-primary/10 scale-[1.02]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-xs font-medium">
            추천
          </div>
          <h3 className="text-lg font-bold text-gray-900">프로</h3>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">50,000</span>
            <span className="text-sm text-gray-500">원/월</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">전문적인 부동산 분석</p>
          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            프로 시작하기
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Business */}
        <div className="p-6 rounded-2xl border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">비즈니스</h3>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">100,000</span>
            <span className="text-sm text-gray-500">원/월</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">기업 · 부동산 전문가</p>
          <Link
            href="/login"
            className="mt-6 block w-full py-2.5 rounded-lg text-sm font-medium text-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            비즈니스 시작
          </Link>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-4 font-semibold text-gray-900">기능</th>
              <th className="text-center px-4 py-4 font-semibold text-gray-900 w-[120px]">무료</th>
              <th className="text-center px-4 py-4 font-semibold text-primary w-[120px]">프로</th>
              <th className="text-center px-4 py-4 font-semibold text-gray-900 w-[120px]">비즈니스</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {features.map((f) => (
              <tr key={f.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5 text-gray-700">{f.name}</td>
                <td className="px-4 py-3.5 text-center"><FeatureCell value={f.free} /></td>
                <td className="px-4 py-3.5 text-center bg-primary/[0.02]"><FeatureCell value={f.pro} /></td>
                <td className="px-4 py-3.5 text-center"><FeatureCell value={f.business} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">자주 묻는 질문</h2>
        <div className="space-y-4">
          {[
            {
              q: "무료 플랜은 기간 제한이 있나요?",
              a: "아닙니다. 무료 플랜은 기간 제한 없이 계속 사용 가능합니다. 일일 분석 횟수(5회)와 일부 기능에만 제한이 있습니다.",
            },
            {
              q: "요금제를 변경하면 바로 적용되나요?",
              a: "네, 업그레이드는 즉시 적용됩니다. 다운그레이드는 현재 결제 주기가 끝난 후 적용됩니다.",
            },
            {
              q: "환불 정책은 어떻게 되나요?",
              a: "결제 후 7일 이내 전액 환불이 가능합니다. 이후에는 남은 기간에 대한 일할 계산 환불이 적용됩니다.",
            },
            {
              q: "결제 수단은 무엇이 있나요?",
              a: "신용카드, 체크카드, 카카오페이, 네이버페이를 지원합니다. (결제 시스템 준비 중)",
            },
          ].map((item) => (
            <details key={item.q} className="group rounded-xl border border-gray-200 overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors list-none flex items-center justify-between">
                {item.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9662;</span>
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
