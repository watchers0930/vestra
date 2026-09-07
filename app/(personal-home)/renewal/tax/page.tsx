import TaxClient, { type TaxTab } from "./TaxClient";

export const metadata = {
  title: "세금계산 - VESTRA",
  description: "취득세 · 보유세 · 양도세 시뮬레이션",
};

// 외부 링크(공시가조회 등)의 tab 값을 내부 탭 키로 정규화 (holding→hold 등)
const TAB_MAP: Record<string, TaxTab> = {
  acq: "acq", acquisition: "acq",
  hold: "hold", holding: "hold",
  trans: "trans", transfer: "trans",
  scn: "scn", scenario: "scn",
};

export default async function TaxRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; assessed?: string; address?: string }>;
}) {
  const { tab, assessed, address } = await searchParams;
  const initialTab: TaxTab = tab ? (TAB_MAP[tab] ?? "acq") : "acq";
  const a = assessed ? Number(assessed) : NaN;
  const initialAssessed = Number.isFinite(a) && a > 0 ? a : undefined;
  const initialAddress = address?.trim() || undefined;

  return <TaxClient initialTab={initialTab} initialAssessed={initialAssessed} initialAddress={initialAddress} />;
}
