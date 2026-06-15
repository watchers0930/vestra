export type PropertyType = "아파트" | "연립/빌라/다세대";
export type PriceMapTradeType = "매매" | "전세" | "월세";

export interface AptData {
  name: string;
  dong: string;
  price: number;
  area: number;
  lat: number;
  lng: number;
  change: number | null;
  year: number;
  propertyType?: PropertyType;
  deposit?: number;
  monthlyRent?: number;
  count?: number;         // 비아파트 동 집계 건수
}

export interface RiskItem {
  label: string;
  level: "안전" | "주의" | "위험";
  value: string;
  detail: string;
}

export interface MapResponse {
  gu: string;
  propertyType: PropertyType;
  tradeType: PriceMapTradeType;
  dataSource: "molit" | "none";
  apartments: AptData[];
  center: { lat: number; lng: number };
  availableGus: string[];
  regionGroups: Record<string, string[]>;
  total: number;
}
