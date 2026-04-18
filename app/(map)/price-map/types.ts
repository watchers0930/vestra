export interface AptData {
  name: string;
  dong: string;
  price: number;
  area: number;
  lat: number;
  lng: number;
  change: number | null;
  year: number;
}

export interface RiskItem {
  label: string;
  level: "안전" | "주의" | "위험";
  value: string;
  detail: string;
}

export interface MapResponse {
  gu: string;
  apartments: AptData[];
  center: { lat: number; lng: number };
  availableGus: string[];
  regionGroups: Record<string, string[]>;
  total: number;
}
