export default function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VESTRA",
    alternateName: "베스트라",
    url: "https://vestra-plum.vercel.app",
    description:
      "AI가 분석하는 부동산 자산관리. 등기부등본 분석, 계약서 검토, 세무 시뮬레이션, 시세 전망, 전세 안전성 진단까지 한 곳에서.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    creator: {
      "@type": "Organization",
      name: "BMI C&S",
    },
    inLanguage: "ko",
    featureList: [
      "AI 등기부등본 분석",
      "전세 안전성 진단",
      "계약서 AI 검토",
      "세금 시뮬레이션",
      "시세 전망",
      "시세 지도",
      "대출 가심사",
      "권리 분석",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
