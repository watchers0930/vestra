import RightsRenewalClient from "./RightsRenewalClient";

export const metadata = {
  title: "권리분석 - VESTRA",
  description: "부동산 권리분석 AI 서비스",
};

export default async function RightsRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>;
}) {
  const { address } = await searchParams;
  return <RightsRenewalClient initialAddress={address ?? ""} />;
}
