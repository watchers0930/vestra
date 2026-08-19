import { Suspense } from "react";
import { headers } from "next/headers";
import { isMobileUserAgent } from "@/lib/device";
import ListingsMapClient from "./ListingsMapClient";
import ListingsMapMobileClient from "../listings-map-mobile/ListingsMapMobileClient";

export const metadata = {
  title: "매물검색 지도 - VESTRA",
  description: "베스트라 인증 안심 매물 지도 검색",
};

// 적응형: 디바이스별 전용 컴포넌트를 서버가 선택 렌더
export default async function ListingsMapPage() {
  const ua = (await headers()).get("user-agent");
  const Comp = isMobileUserAgent(ua) ? ListingsMapMobileClient : ListingsMapClient;
  return (
    <Suspense fallback={null}>
      <Comp />
    </Suspense>
  );
}
