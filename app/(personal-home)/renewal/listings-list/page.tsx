import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMobileUserAgent } from "@/lib/device";
import ListingsListClient from "./ListingsListClient";

export const metadata = {
  title: "매물검색 - VESTRA",
  description: "베스트라 인증 안심 매물 검색",
};

export default async function ListingsListPage() {
  const ua = (await headers()).get("user-agent");
  if (isMobileUserAgent(ua)) redirect("/renewal/listings-list-mobile");

  return <ListingsListClient />;
}
