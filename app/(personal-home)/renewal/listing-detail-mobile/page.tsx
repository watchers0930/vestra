import { Suspense } from "react";
import ListingDetailMobileClient from "./ListingDetailMobileClient";

export const metadata = {
  title: "매물 상세 (모바일) - VESTRA",
  description: "베스트라 안심인증 매물 상세 모바일",
};

export default function ListingDetailMobilePage() {
  return (
    <Suspense fallback={null}>
      <ListingDetailMobileClient />
    </Suspense>
  );
}
