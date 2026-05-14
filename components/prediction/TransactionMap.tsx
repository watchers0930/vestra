"use client";

import { useEffect, useRef } from "react";

interface Transaction {
  dealAmount: number;
  aptName: string;
  area: number;
  floor: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  dong?: string;
}

interface TransactionMapProps {
  transactions: Transaction[];
  address: string;
  center?: [number, number];
}

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

function priceToColor(price: number, min: number, max: number): string {
  if (max === min) return "#6366f1";
  const ratio = Math.min(1, Math.max(0, (price - min) / (max - min)));
  const r = Math.round(59 + ratio * 196);
  const g = Math.round(130 - ratio * 80);
  const b = Math.round(246 - ratio * 186);
  return `rgb(${r},${g},${b})`;
}

function keywordSearchApt(
  ps: unknown,
  query: string,
): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ps as any).keywordSearch(query, (results: any[], status: string) => {
      if (status === "OK" && results.length > 0) {
        resolve([parseFloat(results[0].y), parseFloat(results[0].x)]);
      } else {
        resolve(null);
      }
    });
  });
}

export default function TransactionMap({ transactions, address, center }: TransactionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    const mapElement = mapRef.current;
    if (!mapElement || transactions.length === 0) return;
    let cancelled = false;

    const init = async () => {
      if (!window.kakao?.maps) return;
      const kakao = window.kakao;

      mapElement.innerHTML = "";

      const fallback = center || getFallbackCoords(address);
      const map = new kakao.maps.Map(mapElement, {
        center: new kakao.maps.LatLng(fallback[0], fallback[1]),
        level: 5,
      });
      mapInstanceRef.current = map;

      const prices = transactions.map((t) => t.dealAmount);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // 아파트별 그룹화
      const aptGroups = new Map<string, { txs: Transaction[]; dong: string }>();
      for (const t of transactions) {
        const key = t.aptName;
        if (!aptGroups.has(key)) aptGroups.set(key, { txs: [], dong: t.dong || "" });
        aptGroups.get(key)!.txs.push(t);
      }

      const ps = new kakao.maps.services.Places();
      const coordCache = new Map<string, [number, number]>();

      // 지역명 추출 (주소에서)
      const regionMatch = address.match(/([가-힣]+[시군구])\s*([가-힣]+[읍면동])?/);
      const region = regionMatch ? regionMatch[0] : "";

      for (const [aptName, { txs, dong }] of aptGroups) {
        if (cancelled) return;

        let coords: [number, number] | null = null;

        // 1차: "지역 동 아파트명" 키워드 검색
        const searchQuery = `${region} ${dong} ${aptName}`.trim();
        coords = await keywordSearchApt(ps, searchQuery);

        // 2차: "동 아파트명" 키워드 검색
        if (!coords && dong) {
          coords = await keywordSearchApt(ps, `${dong} ${aptName}`);
        }

        // 3차: 아파트명만 키워드 검색
        if (!coords) {
          coords = await keywordSearchApt(ps, aptName);
        }

        // 4차: 폴백 (중심 + 캐시 기반 랜덤 오프셋)
        if (!coords) {
          const cached = coordCache.get(dong || aptName);
          if (cached) {
            coords = [
              cached[0] + (Math.random() - 0.5) * 0.002,
              cached[1] + (Math.random() - 0.5) * 0.002,
            ];
          } else {
            coords = [
              fallback[0] + (Math.random() - 0.5) * 0.006,
              fallback[1] + (Math.random() - 0.5) * 0.006,
            ];
          }
        } else {
          coordCache.set(dong || aptName, coords);
        }

        if (cancelled) return;

        // 해당 아파트 평균 거래가로 마커 하나 표시
        const avgPrice = Math.round(txs.reduce((s, t) => s + t.dealAmount, 0) / txs.length);
        const color = priceToColor(avgPrice, minPrice, maxPrice);
        const formattedPrice = avgPrice >= 100_000_000
          ? `${(avgPrice / 100_000_000).toFixed(1)}억`
          : `${(avgPrice / 10_000).toLocaleString()}만`;

        const circle = new kakao.maps.Circle({
          center: new kakao.maps.LatLng(coords[0], coords[1]),
          radius: 50 + txs.length * 5, // 거래 건수에 비례한 크기
          strokeWeight: 2,
          strokeColor: "#fff",
          strokeOpacity: 0.9,
          fillColor: color,
          fillOpacity: 0.8,
        });
        circle.setMap(map);

        const txList = txs
          .slice(0, 5)
          .map((t) => {
            const p = t.dealAmount >= 100_000_000
              ? `${(t.dealAmount / 100_000_000).toFixed(1)}억`
              : `${(t.dealAmount / 10_000).toLocaleString()}만`;
            return `<div style="color:#555;font-size:11px">${p} · ${Math.round(t.area)}㎡ · ${t.floor}층</div>`;
          })
          .join("");

        const infowindow = new kakao.maps.InfoWindow({
          content:
            `<div style="padding:10px 12px;font-size:12px;line-height:1.6;min-width:140px;max-width:200px">` +
            `<b style="display:block;margin-bottom:4px;font-size:13px">${aptName}</b>` +
            `<span style="color:${color};font-weight:700;font-size:14px">${formattedPrice}</span>` +
            `<span style="color:#aaa;font-size:11px;margin-left:6px">평균 (${txs.length}건)</span>` +
            `<div style="margin-top:6px;border-top:1px solid #f0f0f0;padding-top:6px">${txList}</div>` +
            `</div>`,
        });

        const pos = new kakao.maps.LatLng(coords[0], coords[1]);
        kakao.maps.event.addListener(circle, "click", () => {
          infowindow.open(map, { getPosition: () => pos });
        });
      }
    };

    if (window.kakao?.maps) {
      init();
    } else {
      const timer = setInterval(() => {
        if (window.kakao?.maps) { clearInterval(timer); init(); }
      }, 200);
      const timeoutId = setTimeout(() => clearInterval(timer), 10000);
      return () => {
        clearInterval(timer);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      cancelled = true;
      mapElement.innerHTML = "";
      mapInstanceRef.current = null;
    };
  }, [transactions, address, center]);

  if (transactions.length === 0) return null;

  const prices = transactions.map((t) => t.dealAmount);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const formatShort = (v: number) =>
    v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}억` : `${(v / 10_000).toLocaleString()}만`;

  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e5e7" }}>
      <div ref={mapRef} style={{ height: "360px", width: "100%" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#f5f5f7", fontSize: "11px", color: "#6e6e73" }}>
        <span>{transactions.length}건 거래 · 아파트별 실위치 표시</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: priceToColor(minPrice, minPrice, maxPrice), display: "inline-block" }} />
            {formatShort(minPrice)}
          </span>
          <span style={{ width: "40px", height: "6px", borderRadius: "3px", background: "linear-gradient(to right, #3b82f6, #8b5cf6, #ef4444)", display: "inline-block" }} />
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: priceToColor(maxPrice, minPrice, maxPrice), display: "inline-block" }} />
            {formatShort(maxPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
