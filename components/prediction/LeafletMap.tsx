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
  "분당": [37.3825, 127.1199],
  "성남시": [37.4201, 127.1265],
  "수원시": [37.2636, 127.0286],
  "고양시": [37.6584, 126.8320],
  "용인시": [37.2411, 127.1776],
  "화성시": [37.1997, 126.8313],
};

function getFallbackCoords(address: string): [number, number] {
  for (const [area, coords] of Object.entries(AREA_COORDS)) {
    if (address.includes(area)) return coords;
  }
  return [37.5665, 126.9780]; // 서울시청 기본값
}

/** Nominatim Geocoding API로 주소 → 좌표 변환 */
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const query = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=kr&limit=1`,
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
