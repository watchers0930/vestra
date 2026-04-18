import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { EditorialSection } from "./components/EditorialSection";
import { PricingSection } from "./components/PricingSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { CtaSection } from "./components/CtaSection";

export const metadata = {
  title: "VESTRA - AI 부동산 자산관리 플랫폼",
  description: "전세사기 예방부터 안전한 매매까지. 등기부등본 권리분석, 전세 안전진단, 계약서 위험 검출, 세금 절세 시뮬레이션을 AI가 처리합니다.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VESTRA",
  url: "https://vestra-plum.vercel.app",
  description: "AI 기반 부동산 자산관리 플랫폼. 전세사기 예방, 권리분석, 계약서 검토, 세금 시뮬레이션.",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: "Korean",
  },
};

export default function LandingPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <FeaturesSection />
      <EditorialSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
    </div>
  );
}
