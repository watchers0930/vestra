import { Suspense } from "react";
import ListingsMapClient from "./ListingsMapClient";

export const metadata = {
  title: "매물검색 지도 - VESTRA",
  description: "베스트라 인증 안심 매물 지도 검색",
};

export default function ListingsMapPage() {
  return (
    <Suspense fallback={null}>
      <ListingsMapClient />
    </Suspense>
  );
}
