import MonitoringRenewalClient from "./MonitoringRenewalClient";
import { guestMonitoringEnabled } from "@/lib/guest-monitoring/config";

export const metadata = {
  title: "등기감시 - VESTRA",
  description: "부동산 등기 변동 자동 감시 서비스",
};

export default async function MonitoringRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; listingId?: string }>;
}) {
  const { address, listingId } = await searchParams;
  // 비회원 신청 섹션은 서버 기능 플래그로만 노출 제어(클라이언트 판정으로 대체 금지, 설계 §0·§3.0).
  const guestEnabled = guestMonitoringEnabled();
  return (
    <MonitoringRenewalClient
      initialAddress={address ?? ""}
      initialListingId={listingId ?? ""}
      guestEnabled={guestEnabled}
    />
  );
}
