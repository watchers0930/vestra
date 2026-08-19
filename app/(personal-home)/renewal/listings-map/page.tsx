import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMobileUserAgent } from "@/lib/device";
import ListingsMapClient from "./ListingsMapClient";

export const metadata = {
  title: "매물검색 지도 - VESTRA",
  description: "베스트라 인증 안심 매물 지도 검색",
};

function buildQuery(sp: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const q = qs.toString();
  return q ? `?${q}` : "";
}

export default async function ListingsMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ua = (await headers()).get("user-agent");
  if (isMobileUserAgent(ua)) {
    redirect(`/renewal/listings-map-mobile${buildQuery(await searchParams)}`);
  }

  return (
    <Suspense fallback={null}>
      <ListingsMapClient />
    </Suspense>
  );
}
