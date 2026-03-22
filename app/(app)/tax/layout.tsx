import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "세무 시뮬레이션",
  description: "취득세·양도세·종부세 등 부동산 세금을 시나리오별로 계산합니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
