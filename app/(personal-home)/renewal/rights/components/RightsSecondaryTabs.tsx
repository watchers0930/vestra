import type { UnifiedResult } from "@/components/rights/RightsResult";
import OwnerVerifyTab from "./OwnerVerifyTab";
import RegistryHistoryTab from "./RegistryHistoryTab";
import GuideTab from "./GuideTab";

type TabId = "analysis" | "owner" | "history" | "guide";

interface Props {
  activeTab: TabId;
  result: UnifiedResult | null;
  ownerMatch: boolean | null;
  registryOwnerMasked: string;
}

/** 보조 탭 라우터 — 활성 탭에 해당하는 실데이터 패널만 렌더. */
export default function RightsSecondaryTabs({ activeTab, result, ownerMatch, registryOwnerMasked }: Props) {
  if (activeTab === "owner" && result) {
    return <OwnerVerifyTab result={result} ownerMatch={ownerMatch} registryOwnerMasked={registryOwnerMasked} />;
  }
  if (activeTab === "history" && result) {
    return <RegistryHistoryTab result={result} />;
  }
  if (activeTab === "guide") {
    return <GuideTab />;
  }
  return null;
}
