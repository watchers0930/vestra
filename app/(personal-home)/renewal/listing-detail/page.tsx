import { Suspense } from "react";
import ListingDetailClient from "./ListingDetailClient";

export const metadata = {
  title: "매물 상세 - VESTRA",
  description: "베스트라 안심인증 매물 상세 페이지",
};

export default function ListingDetailPage() {
  return (
    <Suspense fallback={null}>
      <ListingDetailClient />
    </Suspense>
  );
}
