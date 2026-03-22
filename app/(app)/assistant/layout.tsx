import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 어시스턴트",
  description: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문할 수 있습니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
