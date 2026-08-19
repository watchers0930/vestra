import { Suspense } from "react";
import { headers } from "next/headers";
import { isMobileUserAgent } from "@/lib/device";
import ListingDetailClient from "./ListingDetailClient";
import ListingDetailMobileClient from "../listing-detail-mobile/ListingDetailMobileClient";

export const metadata = {
  title: "매물 상세 - VESTRA",
  description: "베스트라 안심인증 매물 상세 페이지",
};

// 적응형: 디바이스별 전용 컴포넌트를 서버가 선택 렌더
export default async function ListingDetailPage() {
  const ua = (await headers()).get("user-agent");
  const Comp = isMobileUserAgent(ua) ? ListingDetailMobileClient : ListingDetailClient;
  return (
    <Suspense fallback={null}>
      <Comp />
    </Suspense>
  );
}
