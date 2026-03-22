import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계약서 검토",
  description: "매매·임대차 계약서를 AI가 검토하고 위험 조항을 알려드립니다",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
