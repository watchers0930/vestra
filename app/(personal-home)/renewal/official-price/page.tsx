import OfficialPriceClient from "./OfficialPriceClient";

export const metadata = {
  title: "공시가격 조회 - VESTRA",
  description: "개별공시지가 · 공동주택가격 · 개별주택가격 통합 조회",
};

export default function OfficialPriceRenewalPage() {
  return <OfficialPriceClient />;
}
