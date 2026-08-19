import { Suspense } from "react";
import ListingDbDetailClient from "./ListingDbDetailClient";

export const metadata = {
  title: "등록매물 상세 - VESTRA",
  description: "베스트라 안심인증 등록매물 상세 페이지",
};

export default function ListingDbDetailPage() {
  return (
    <Suspense fallback={null}>
      <ListingDbDetailClient />
    </Suspense>
  );
}
