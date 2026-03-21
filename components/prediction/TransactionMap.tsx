"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── 타입 ───

interface Transaction {
  dealAmount: number;
  aptName: string;
  area: number;
  floor: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
}

interface TransactionMapProps {
  /** 거래 데이터 목록 */
  transactions: Transaction[];
  /** 중심 주소 텍스트 (좌표 폴백용) */
  address: string;
  /** 중심 좌표 (카카오맵 geocode 결과 등) */
  center?: [number, number];
}

// ─── 지역별 좌표 매핑 (Geocoding 폴백) ───

const AREA_COORDS: Record<string, [number, number]> = {
  "강남구": [37.5172, 127.0473], "서초구": [37.4837, 127.0324],
  "송파구": [37.5145, 127.1060], "강동구": [37.5301, 127.1238],
  "마포구": [37.5663, 126.9014], "용산구": [37.5326, 126.9906],
  "성동구": [37.5634, 127.0369], "광진구": [37.5385, 127.0824],
  "동작구": [37.5124, 126.9393], "영등포구": [37.5264, 126.8963],
  "양천구": [37.5170, 126.8665], "강서구": [37.5510, 126.8495],
  "구로구": [37.4955, 126.8876], "금천구": [37.4569, 126.8955],
  "관악구": [37.4783, 126.9516], "노원구": [37.6543, 127.0568],
  "도봉구": [37.6688, 127.0472], "강북구": [37.6397, 127.0256],
  "성북구": [37.5894, 127.0167], "중랑구": [37.6063, 127.0928],
  "동대문구": [37.5744, 127.0396], "종로구": [37.5735, 126.9790],
  "중구": [37.5636, 126.9975], "은평구": [37.6027, 126.9292],
  "서대문구": [37.5791, 126.9368],
  "분당": [37.3825, 127.1199], "성남시": [37.4201, 127.1265],
  "수원시": [37.2636, 127.0286], "고양시": [37.6584, 126.8320],
  "용인시": [37.2411, 127.1776], "화성시": [37.1997, 126.8313],
  "광명시": [37.4786, 126.8644], "안양시": [37.3943, 126.9568],
  "부천시": [37.5034, 126.7660], "안산시": [37.3219, 126.8309],
  "하남시": [37.5393, 127.2148], "의정부시": [37.7381, 127.0337],
  "남양주시": [37.6360, 127.2166],
  "인천": [37.4563, 126.7052],
  "부산": [35.1796, 129.0756], "대구": [35.8714, 128.6014],
  "대전": [36.3504, 127.3845], "광주": [35.1595, 126.8526],
};

function getFallbackCoords(address: string): [number, number] {
  for (const [area, coords] of Object.entries(AREA_COORDS)) {
    if (address.includes(area)) return coords;
  }
  return [37.5665, 126.9780];
}

// ─── 가격 → 색상 보간 ───

function priceToColor(price: number, min: number, max: number): string {
  if (max === min) return "#6366f1";
  const ratio = Math.min(1, Math.max(0, (price - min) / (max - min)));
  // 파랑(저가) → 보라(중간) → 빨강(고가)
  const r = Math.round(59 + ratio * 196); // 59 → 255
  const g = Math.round(130 - ratio * 80);  // 130 → 50
  const b = Math.round(246 - ratio * 186); // 246 → 60
  return `rgb(${r},${g},${b})`;
}

// ─── 컴포넌트 ───

export default function TransactionMap({ transactions, address, center }: TransactionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || transactions.length === 0) return;

    // 이전 인스턴스 정리
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const coords = center || getFallbackCoords(address);

    const map = L.map(mapRef.current, {
      center: coords,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | VESTRA',
      maxZoom: 19,
    }).addTo(map);

    // 가격 범위 계산
    const prices = transactions.map((t) => t.dealAmount);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // 거래를 아파트별로 그룹화하여 약간의 좌표 오프셋 생성
    const aptGroups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const group = aptGroups.get(t.aptName) || [];
      group.push(t);
      aptGroups.set(t.aptName, group);
    }

    let markerIndex = 0;
    for (const [aptName, txs] of aptGroups) {
      // 각 아파트 그룹에 대해 중심에서 약간의 랜덤 오프셋
      const groupOffset: [number, number] = [
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.004,
      ];

      for (const t of txs) {
        // 개별 거래에 작은 추가 오프셋
        const lat = coords[0] + groupOffset[0] + (Math.random() - 0.5) * 0.002;
        const lng = coords[1] + groupOffset[1] + (Math.random() - 0.5) * 0.002;

        const color = priceToColor(t.dealAmount, minPrice, maxPrice);
        const formattedPrice = t.dealAmount >= 100_000_000
          ? `${(t.dealAmount / 100_000_000).toFixed(1)}억`
          : `${(t.dealAmount / 10_000).toLocaleString()}만`;

        L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: color,
          fillOpacity: 0.75,
          color: "#fff",
          weight: 1.5,
        })
          .addTo(map)
          .bindPopup(
            `<div style="font-size:12px;line-height:1.5;min-width:120px">` +
            `<b>${aptName}</b><br/>` +
            `<span style="color:${color};font-weight:600">${formattedPrice}</span><br/>` +
            `${Math.round(t.area)}㎡ · ${t.floor}층<br/>` +
            `<span style="color:#888">${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}.${String(t.dealDay).padStart(2, "0")}</span>` +
            `</div>`
          );

        markerIndex++;
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
  }, [transactions, address, center]);

  if (transactions.length === 0) return null;

  // 가격 범위 (범례용)
  const prices = transactions.map((t) => t.dealAmount);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const formatShort = (v: number) =>
    v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}억` : `${(v / 10_000).toLocaleString()}만`;

  return (
    <div className="rounded-xl overflow-hidden border border-[#e5e5e7]">
      <div ref={mapRef} className="h-[300px] sm:h-[400px] w-full" />
      {/* 범례 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f5f5f7] text-[11px] text-[#6e6e73]">
        <span>{transactions.length}건 거래</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: priceToColor(minPrice, minPrice, maxPrice) }} />
            {formatShort(minPrice)}
          </span>
          <span className="w-10 h-1.5 rounded-full" style={{ background: "linear-gradient(to right, #3b82f6, #8b5cf6, #ef4444)" }} />
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: priceToColor(maxPrice, minPrice, maxPrice) }} />
            {formatShort(maxPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
