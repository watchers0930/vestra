import { headers } from "next/headers";
import { isMobileUserAgent } from "@/lib/device";
import ListingsListClient from "./ListingsListClient";
import ListingsListMobileClient from "../listings-list-mobile/ListingsListMobileClient";

export const metadata = {
  title: "매물검색 - VESTRA",
  description: "베스트라 인증 안심 매물 검색",
};

// 적응형: 같은 URL에서 디바이스별 전용 컴포넌트를 서버가 선택 렌더 (PC/모바일 CSS·코드 완전 분리)
export default async function ListingsListPage() {
  const ua = (await headers()).get("user-agent");
  return isMobileUserAgent(ua) ? <ListingsListMobileClient /> : <ListingsListClient />;
}
