import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "전세보호",
  description: "전세 안전 진단부터 전입신고·확정일자까지 보호 절차를 안내합니다",
};

export default function JeonseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
