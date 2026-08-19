import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMobileUserAgent } from "@/lib/device";
import ListingDetailClient from "./ListingDetailClient";

export const metadata = {
  title: "매물 상세 - VESTRA",
  description: "베스트라 안심인증 매물 상세 페이지",
};

function buildQuery(sp: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const q = qs.toString();
  return q ? `?${q}` : "";
}

export default async function ListingDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ua = (await headers()).get("user-agent");
  if (isMobileUserAgent(ua)) {
    redirect(`/renewal/listing-detail-mobile${buildQuery(await searchParams)}`);
  }

  return (
    <Suspense fallback={null}>
      <ListingDetailClient />
    </Suspense>
  );
}
