import { Suspense } from "react";
import { headers } from "next/headers";
import { isMobileUserAgent } from "@/lib/device";
import ListingDbDetailClient from "./ListingDbDetailClient";
import ListingDbDetailMobileClient from "../listing-db-detail-mobile/ListingDbDetailMobileClient";

export const metadata = {
  title: "등록매물 상세 - VESTRA",
  description: "베스트라 안심인증 등록매물 상세 페이지",
};

// 적응형: 디바이스별 전용 컴포넌트를 서버가 선택 렌더
export default async function ListingDbDetailPage() {
  const ua = (await headers()).get("user-agent");
  const Comp = isMobileUserAgent(ua) ? ListingDbDetailMobileClient : ListingDbDetailClient;
  return (
    <Suspense fallback={null}>
      <Comp />
    </Suspense>
  );
}
