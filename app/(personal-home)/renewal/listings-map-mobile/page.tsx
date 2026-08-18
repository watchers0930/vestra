import { Suspense } from "react";
import ListingsMapMobileClient from "./ListingsMapMobileClient";

export const metadata = {
  title: "매물 지도 (모바일) - VESTRA",
  description: "베스트라 인증 안심 매물 지도 모바일",
};

export default function ListingsMapMobilePage() {
  return (
    <Suspense fallback={null}>
      <ListingsMapMobileClient />
    </Suspense>
  );
}
