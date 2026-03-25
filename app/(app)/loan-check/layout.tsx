import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대출 가심사",
  description:
    "7대 은행 전세대출 조건을 한번에 비교하세요. AI가 분석하는 대출 한도, 금리, LTV/DTI 시뮬레이션을 제공합니다.",
  openGraph: {
    title: "대출 가심사 | VESTRA - AI 자산관리 플랫폼",
    description:
      "7대 은행 전세대출 조건을 한번에 비교하세요. AI가 분석하는 대출 한도, 금리, LTV/DTI 시뮬레이션을 제공합니다.",
  },
};

export default function LoanCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
