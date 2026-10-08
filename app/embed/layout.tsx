import type { Metadata } from "next";

/**
 * 임베드 위젯 전용 레이아웃.
 * 루트 layout.tsx가 html/body/providers를 제공하므로 여기서는
 * GNB·사이드바 없이 위젯만 노출한다. iframe 삽입용이라 검색엔진 색인 제외.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "VESTRA 위젯",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
