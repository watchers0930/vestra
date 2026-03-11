"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/common";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── 타입 정의 ───

export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number; // 0~1 (위험 강도)
  label?: string; // 지역명
}

interface RiskHeatMapProps {
  /** 히트맵 데이터 포인트 */
  data: HeatPoint[];
  /** 지도 중심 좌표 (기본: 서울시청) */
  center?: [number, number];
  /** 기본 줌 레벨 */
  zoom?: number;
  /** 높이 */
  height?: string;
  /** 제목 */
  title?: string;
}

// ─── 기본 위험 데이터 (전세사기 다발 지역 샘플) ───

export const SAMPLE_FRAUD_DATA: HeatPoint[] = [
  // 서울 — 전세사기 다발 지역
  { lat: 37.5172, lng: 127.0473, intensity: 0.9, label: "강남구" },
  { lat: 37.4837, lng: 127.0324, intensity: 0.5, label: "서초구" },
  { lat: 37.5145, lng: 127.106, intensity: 0.85, label: "송파구" },
  { lat: 37.5663, lng: 126.9014, intensity: 0.7, label: "마포구" },
  { lat: 37.5264, lng: 126.8963, intensity: 0.75, label: "영등포구" },
  { lat: 37.5634, lng: 127.0369, intensity: 0.65, label: "성동구" },
  { lat: 37.5385, lng: 127.0824, intensity: 0.6, label: "광진구" },
  { lat: 37.5124, lng: 126.9393, intensity: 0.8, label: "동작구" },
  { lat: 37.478, lng: 126.9516, intensity: 0.85, label: "관악구" },
  { lat: 37.6543, lng: 127.0568, intensity: 0.55, label: "노원구" },
  { lat: 37.5894, lng: 127.0167, intensity: 0.45, label: "성북구" },
  { lat: 37.5735, lng: 126.979, intensity: 0.4, label: "종로구" },
  { lat: 37.5636, lng: 126.9975, intensity: 0.5, label: "중구" },
  { lat: 37.6027, lng: 126.9292, intensity: 0.6, label: "은평구" },
  { lat: 37.517, lng: 126.8665, intensity: 0.7, label: "양천구" },
  { lat: 37.551, lng: 126.8495, intensity: 0.65, label: "강서구" },
  { lat: 37.4955, lng: 126.8876, intensity: 0.75, label: "구로구" },
  { lat: 37.4569, lng: 126.8955, intensity: 0.8, label: "금천구" },
  { lat: 37.5326, lng: 126.9906, intensity: 0.55, label: "용산구" },
  { lat: 37.5301, lng: 127.1238, intensity: 0.5, label: "강동구" },
  // 경기도
  { lat: 37.4201, lng: 127.1265, intensity: 0.7, label: "성남시" },
  { lat: 37.2636, lng: 127.0286, intensity: 0.6, label: "수원시" },
  { lat: 37.6584, lng: 126.832, intensity: 0.55, label: "고양시" },
  { lat: 37.2411, lng: 127.1776, intensity: 0.5, label: "용인시" },
  { lat: 37.4786, lng: 126.8644, intensity: 0.75, label: "광명시" },
  { lat: 37.3943, lng: 126.9568, intensity: 0.65, label: "안양시" },
  { lat: 37.5034, lng: 126.766, intensity: 0.7, label: "부천시" },
  { lat: 37.3219, lng: 126.8309, intensity: 0.6, label: "안산시" },
  { lat: 37.5393, lng: 127.2148, intensity: 0.45, label: "하남시" },
  { lat: 37.7381, lng: 127.0337, intensity: 0.5, label: "의정부시" },
  { lat: 37.636, lng: 127.2166, intensity: 0.55, label: "남양주시" },
  // 인천
  { lat: 37.4563, lng: 126.7052, intensity: 0.8, label: "인천시" },
  // 광역시
  { lat: 35.1796, lng: 129.0756, intensity: 0.65, label: "부산" },
  { lat: 35.8714, lng: 128.6014, intensity: 0.55, label: "대구" },
  { lat: 36.3504, lng: 127.3845, intensity: 0.45, label: "대전" },
  { lat: 35.1595, lng: 126.8526, intensity: 0.5, label: "광주" },
];

// ─── 컴포넌트 ───

export default function RiskHeatMap({
  data,
  center = [37.5665, 126.978],
  zoom = 11,
  height = "450px",
  title = "전세사기 위험지도",
}: RiskHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);
  const [showHeat, setShowHeat] = useState(true);

  useEffect(() => {
    if (!mapRef.current || data.length === 0) return;

    // 이전 인스턴스 정리
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    // 타일 레이어
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | VESTRA 위험지도',
      maxZoom: 19,
    }).addTo(map);

    // 히트맵 데이터 변환: [lat, lng, intensity]
    const heatData: [number, number, number][] = data.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    // leaflet.heat 동적 로드
    import("leaflet.heat").then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heat = (L as any).heatLayer(heatData, {
        radius: 30,
        blur: 20,
        maxZoom: 15,
        max: 1.0,
        gradient: {
          0.2: "#2196F3", // 안전 (파랑)
          0.4: "#4CAF50", // 양호 (초록)
          0.6: "#FF9800", // 주의 (주황)
          0.8: "#F44336", // 위험 (빨강)
          1.0: "#9C27B0", // 매우위험 (보라)
        },
      });

      if (showHeat) {
        heat.addTo(map);
      }
      heatLayerRef.current = heat;
    });

    // 라벨 마커 (강도 높은 지역만)
    const highRiskPoints = data.filter((p) => p.intensity >= 0.7);
    for (const point of highRiskPoints) {
      if (point.label) {
        L.circleMarker([point.lat, point.lng], {
          radius: 4,
          fillColor: "#F44336",
          fillOpacity: 0.8,
          color: "#fff",
          weight: 1,
        })
          .addTo(map)
          .bindPopup(
            `<div style="text-align:center">` +
              `<b>${point.label}</b><br/>` +
              `<span style="color:${point.intensity >= 0.8 ? "#F44336" : "#FF9800"}">` +
              `위험지수: ${Math.round(point.intensity * 100)}점</span>` +
              `</div>`
          );
      }
    }

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, center, zoom]);

  // 히트맵 토글
  useEffect(() => {
    if (!heatLayerRef.current || !mapInstanceRef.current) return;
    if (showHeat) {
      heatLayerRef.current.addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }
  }, [showHeat]);

  return (
    <Card className="overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className="flex items-center gap-3">
          {/* 히트맵 토글 */}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showHeat}
              onChange={(e) => setShowHeat(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary"
            />
            히트맵
          </label>
          {/* 범례 */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="w-3 h-3 rounded-sm" style={{ background: "#2196F3" }} />
            <span>안전</span>
            <span className="w-3 h-3 rounded-sm" style={{ background: "#FF9800" }} />
            <span>주의</span>
            <span className="w-3 h-3 rounded-sm" style={{ background: "#F44336" }} />
            <span>위험</span>
          </div>
        </div>
      </div>

      {/* 지도 */}
      <div ref={mapRef} style={{ height, width: "100%" }} />

      {/* 요약 */}
      <div className="p-3 bg-gray-50 text-xs text-muted flex items-center justify-between">
        <span>
          총 {data.length}개 지역 | 고위험({">"}70점):{" "}
          {data.filter((d) => d.intensity >= 0.7).length}개
        </span>
        <span>데이터 기준: 공공데이터 + 분석 결과 종합</span>
      </div>
    </Card>
  );
}
