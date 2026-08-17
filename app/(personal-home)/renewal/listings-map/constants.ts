// 매물검색 지도 화면 공용 상수·타입

// 실데이터 사진이 없는 동안 사용하는 예시 이미지 (②단계 데이터 연동 시 교체)
export const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1555636222-cae831e670b3?w=400&auto=format&fit=crop&q=80",
];

export interface Apt {
  aptName: string;
  dong: string;
  area: number;
  floor: number;
  buildYear: number;
  dealAmount: number;
  dealDate: string;
  lat?: number;
  lng?: number;
}

export type FilterKey = "type" | "trade" | "size";

export const FILTER_DEFAULTS: Record<FilterKey, string> = {
  type: "건물유형",
  trade: "거래유형",
  size: "전체 평형",
};

export const FILTER_OPTIONS: Record<FilterKey, string[]> = {
  type: ["건물유형 (전체)", "아파트", "단독", "다가구", "연립", "빌라"],
  trade: ["거래유형 (전체)", "매매", "전세", "단기임대", "초단기임대"],
  size: [
    "전체 평형",
    "10평형",
    "20평형",
    "30평형",
    "40평형",
    "50평형",
    "50평형 이상",
  ],
};

// 시/도 → 시/군/구 매핑
export const SIGUNGU_MAP: Record<string, string[]> = {
  서울특별시: ["강남구", "서초구", "송파구", "강동구", "마포구", "용산구", "성동구", "광진구"],
  경기도: ["수원시", "성남시", "고양시", "용인시", "안산시"],
};
