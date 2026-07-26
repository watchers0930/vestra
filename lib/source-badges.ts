export type SourceBadgeKey =
  | "court_registry"
  | "molit_price"
  | "vworld_price"
  | "building_registry";

export type SourceBadgeConfig = {
  key: SourceBadgeKey;
  label: string;
  tooltip: string;
};

export const SOURCE_BADGE_DEFINITIONS: Record<SourceBadgeKey, SourceBadgeConfig> = {
  court_registry: {
    key: "court_registry",
    label: "대법원 등기부",
    tooltip: "대법원 인터넷등기소에서 제공하는 실시간 등기부 데이터를 기반으로 분석합니다.",
  },
  molit_price: {
    key: "molit_price",
    label: "국토부 실거래가",
    tooltip: "국토교통부 실거래가 공개시스템(RTMS)의 공공데이터를 기반으로 분석합니다.",
  },
  vworld_price: {
    key: "vworld_price",
    label: "공시지가",
    tooltip: "국토교통부 VWorld에서 제공하는 개별공시지가 및 공동주택공시가격 데이터를 사용합니다.",
  },
  building_registry: {
    key: "building_registry",
    label: "건축물대장",
    tooltip: "국토교통부 세움터에서 제공하는 건축물대장 정보를 활용합니다.",
  },
};

export type SourceBadgePageKey =
  | "rights"
  | "jeonse_analysis"
  | "contract"
  | "prediction";

export const PAGE_SOURCE_BADGES: Record<SourceBadgePageKey, SourceBadgeKey[]> = {
  rights:          ["court_registry", "vworld_price", "building_registry"],
  jeonse_analysis: ["court_registry", "molit_price", "vworld_price", "building_registry"],
  contract:        ["molit_price"],
  prediction:      ["molit_price", "vworld_price"],
};
