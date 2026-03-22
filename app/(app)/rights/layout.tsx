import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "권리분석",
  description: "등기부등본 AI 분석으로 갑구·을구 권리관계를 종합 진단합니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
