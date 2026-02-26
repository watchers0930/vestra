"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/common";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  address: string;
}

// 주요 지역 좌표 매핑 (Geocoding 실패 시 폴백)
const AREA_COORDS: Record<string, [number, number]> = {
  // 서울 자치구
  "강남구": [37.5172, 127.0473],
  "서초구": [37.4837, 127.0324],
  "송파구": [37.5145, 127.1060],
  "강동구": [37.5301, 127.1238],
  "마포구": [37.5663, 126.9014],
  "용산구": [37.5326, 126.9906],
  "성동구": [37.5634, 127.0369],
  "광진구": [37.5385, 127.0824],
  "동작구": [37.5124, 126.9393],
  "영등포구": [37.5264, 126.8963],
  "양천구": [37.5170, 126.8665],
  "강서구": [37.5510, 126.8495],
  "구로구": [37.4955, 126.8876],
  "금천구": [37.4569, 126.8955],
  "관악구": [37.4783, 126.9516],
  "노원구": [37.6543, 127.0568],
  "도봉구": [37.6688, 127.0472],
  "강북구": [37.6397, 127.0256],
  "성북구": [37.5894, 127.0167],
  "중랑구": [37.6063, 127.0928],
  "동대문구": [37.5744, 127.0396],
  "종로구": [37.5735, 126.9790],
  "중구": [37.5636, 126.9975],
  "은평구": [37.6027, 126.9292],
  "서대문구": [37.5791, 126.9368],
  // 경기도
  "분당": [37.3825, 127.1199],
  "성남시": [37.4201, 127.1265],
  "수원시": [37.2636, 127.0286],
  "고양시": [37.6584, 126.8320],
  "용인시": [37.2411, 127.1776],
  "화성시": [37.1997, 126.8313],
  "광명시": [37.4786, 126.8644],
  "안양시": [37.3943, 126.9568],
  "부천시": [37.5034, 126.7660],
  "안산시": [37.3219, 126.8309],
  "시흥시": [37.3800, 126.8030],
  "의왕시": [37.3448, 126.9685],
  "군포시": [37.3616, 126.9352],
  "과천시": [37.4292, 126.9876],
  "하남시": [37.5393, 127.2148],
  "광주시": [37.4095, 127.2573],
  "이천시": [37.2722, 127.4350],
  "여주시": [37.2983, 127.6372],
  "양평군": [37.4917, 127.4876],
  "파주시": [37.7599, 126.7797],
  "김포시": [37.6153, 126.7156],
  "의정부시": [37.7381, 127.0337],
  "남양주시": [37.6360, 127.2166],
  "구리시": [37.5943, 127.1295],
  "양주시": [37.7853, 127.0457],
  "포천시": [37.8949, 127.2003],
  "동두천시": [37.9035, 127.0609],
  "연천군": [38.0964, 127.0752],
  "가평군": [37.8316, 127.5095],
  "평택시": [36.9922, 127.1129],
  "안성시": [37.0080, 127.2797],
  "오산시": [37.1498, 127.0697],
  // 인천
  "인천시": [37.4563, 126.7052],
  "인천": [37.4563, 126.7052],
  // 주요 광역시
  "부산": [35.1796, 129.0756],
  "대구": [35.8714, 128.6014],
  "대전": [36.3504, 127.3845],
  "광주광역": [35.1595, 126.8526],
  "울산": [35.5384, 129.3114],
  "세종": [36.4800, 127.2590],
};

function getFallbackCoords(address: string): [number, number] {
  for (const [area, coords] of Object.entries(AREA_COORDS)) {
    if (address.includes(area)) return coords;
  }
  return [37.5665, 126.9780]; // 서울시청 기본값
}

/** Nominatim API 단건 조회 */
async function nominatimSearch(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=kr&limit=1`,
      { headers: { "Accept-Language": "ko" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch {
    return null;
  }
}

/** 주소 → 좌표 변환 (단계적 검색: 전체 → 시/구/동 → 시/구) */
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  // 1차: 전체 주소로 검색
  const full = await nominatimSearch(address);
  if (full) return full;

  // 주소에서 핵심 지명 추출 (숫자/면적/아파트명 등 제거)
  const cleaned = address
    .replace(/\d+㎡/g, "")
    .replace(/\d+평/g, "")
    .replace(/\d+호/g, "")
    .replace(/\d+동/g, (m) => (/[가-힣]동/.test(m) ? m : ""))
    .trim();

  // 2차: 정제된 주소로 검색
  if (cleaned !== address) {
    const cleanResult = await nominatimSearch(cleaned);
    if (cleanResult) return cleanResult;
  }

  // 3차: 공백으로 분리 후 시/구/동 단위까지만 검색
  const parts = address.split(/\s+/);
  if (parts.length >= 2) {
    // "경기도 광명시 디지털로 64" → "경기도 광명시"
    for (let len = Math.min(parts.length - 1, 3); len >= 2; len--) {
      const partial = parts.slice(0, len).join(" ");
      const result = await nominatimSearch(partial);
      if (result) return result;
    }
  }

  return null;
}

export function LeafletMap({ address }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    // 이전 인스턴스 정리
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    function createMap(coords: [number, number], zoom: number) {
      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current, {
        center: coords,
        zoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.marker(coords, { icon })
        .addTo(map)
        .bindPopup(`<b>${address}</b>`)
        .openPopup();

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    }

    // Geocoding 시도 → 실패 시 폴백 좌표 사용
    geocodeAddress(address).then((coords) => {
      if (coords) {
        createMap(coords, 16);
      } else {
        createMap(getFallbackCoords(address), 15);
      }
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [address]);

  return (
    <Card className="overflow-hidden">
      <div
        ref={mapRef}
        className="h-[300px] w-full"
      />
    </Card>
  );
}
