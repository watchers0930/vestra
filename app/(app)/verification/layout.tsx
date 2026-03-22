import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "상호검증",
  description: "전문가 간 교차 검증으로 분석 결과의 신뢰도를 높입니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
