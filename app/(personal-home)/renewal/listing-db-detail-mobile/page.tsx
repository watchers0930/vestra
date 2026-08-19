import { Suspense } from "react";
import ListingDbDetailMobileClient from "./ListingDbDetailMobileClient";

export const metadata = {
  title: "등록매물 상세 (모바일) - VESTRA",
  description: "베스트라 안심인증 등록매물 상세 모바일",
};

export default function ListingDbDetailMobilePage() {
  return (
    <Suspense fallback={null}>
      <ListingDbDetailMobileClient />
    </Suspense>
  );
}
