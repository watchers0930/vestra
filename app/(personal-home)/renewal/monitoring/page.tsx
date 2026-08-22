import MonitoringRenewalClient from "./MonitoringRenewalClient";

export const metadata = {
  title: "등기감시 - VESTRA",
  description: "부동산 등기 변동 실시간 감시 서비스",
};

export default async function MonitoringRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>;
}) {
  const { address } = await searchParams;
  return <MonitoringRenewalClient initialAddress={address ?? ""} />;
}
