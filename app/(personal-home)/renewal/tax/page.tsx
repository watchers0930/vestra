import TaxClient from "./TaxClient";

export const metadata = {
  title: "세금계산 - VESTRA",
  description: "취득세 · 보유세 · 양도세 시뮬레이션",
};

export default function TaxRenewalPage() {
  return <TaxClient />;
}
