import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시세전망",
  description:
    "AI가 분석하는 아파트 시세 전망. 지역별 가격 추이, 상승·하락 예측, 투자 적정성 분석을 제공합니다.",
  openGraph: {
    title: "시세전망 | VESTRA - AI 자산관리 플랫폼",
    description:
      "AI가 분석하는 아파트 시세 전망. 지역별 가격 추이, 상승·하락 예측, 투자 적정성 분석을 제공합니다.",
  },
};

export default function PredictionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
