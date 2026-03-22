import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사업성 분석",
  description: "다중 문서 기반 SCR 수준 사업성 검증 보고서를 생성합니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
