import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시세지도",
  description:
    "전국 아파트 실거래가를 지도에서 한눈에 확인하세요. AI 기반 시세 분석과 실시간 매매·전세 시세를 제공합니다.",
  openGraph: {
    title: "시세지도 | VESTRA - AI 자산관리 플랫폼",
    description:
      "전국 아파트 실거래가를 지도에서 한눈에 확인하세요. AI 기반 시세 분석과 실시간 매매·전세 시세를 제공합니다.",
  },
};

export default function PriceMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
