import ListingsListClient from "../renewal/listings-list/ListingsListClient";

export const metadata = {
  title: "매물검색 - VESTRA",
  description: "베스트라 인증 안심 매물 검색",
};

export default function ListingsPage() {
  return <ListingsListClient />;
}
