"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, TrendingUp, TrendingDown, Filter, ChevronDown } from "lucide-react";

interface AptData {
  name: string;
  dong: string;
  price: number;
  area: number;
  lat: number;
  lng: number;
  change: number;
  year: number;
}

interface MapResponse {
  gu: string;
  apartments: AptData[];
  center: { lat: number; lng: number };
  availableGus: string[];
  total: number;
}

// 가격을 억 단위 문자열로
function formatPrice(price: number): string {
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const remainder = Math.round((price % 10000) / 1000);
    return remainder > 0 ? `${eok}.${remainder}억` : `${eok}억`;
  }
  return `${(price / 10000).toFixed(1)}억`;
}

// 가격에 따른 마커 색상
function getPriceColor(price: number): { bg: string; text: string; border: string } {
  if (price >= 500000) return { bg: "bg-red-500", text: "text-white", border: "border-red-600" };
  if (price >= 300000) return { bg: "bg-orange-500", text: "text-white", border: "border-orange-600" };
  if (price >= 200000) return { bg: "bg-blue-600", text: "text-white", border: "border-blue-700" };
  if (price >= 100000) return { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" };
  return { bg: "bg-sky-400", text: "text-white", border: "border-sky-500" };
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(str: string | number): string {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );
}

const SEOUL_GUS = [
  "강남구", "서초구", "송파구", "강동구", "마포구", "용산구",
  "성동구", "광진구", "영등포구", "양천구", "강서구", "노원구",
  "도봉구", "강북구", "성북구", "동대문구", "종로구", "은평구",
];

export default function PriceMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<unknown>(null);
  const overlaysRef = useRef<unknown[]>([]);
  const [data, setData] = useState<MapResponse | null>(null);
  const [selectedGu, setSelectedGu] = useState("강남구");
  const [selectedApt, setSelectedApt] = useState<AptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuDropdown, setShowGuDropdown] = useState(false);
  const [tradeType, setTradeType] = useState<"매매" | "전세">("매매");

  // 데이터 fetch
  const fetchData = useCallback(async (gu: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/price-map?gu=${encodeURIComponent(gu)}&type=${tradeType}`);
      const json: MapResponse = await res.json();
      setData(json);
      setSelectedApt(null);
    } catch (err) {
      console.error("시세 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [tradeType]);

  useEffect(() => {
    fetchData(selectedGu);
  }, [selectedGu, fetchData]);

  // 카카오맵 초기화 + 오버레이 마커
  useEffect(() => {
    if (!data || !mapRef.current || !window.kakao?.maps) return;

    const initMap = () => {
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(data.center.lat, data.center.lng);

        if (!kakaoMapRef.current) {
          kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current!, {
            center,
            level: 5,
          });
        } else {
          (kakaoMapRef.current as { setCenter: (c: unknown) => void; relayout: () => void }).setCenter(center);
        }

        const map = kakaoMapRef.current as { setCenter: (c: unknown) => void };

        // 기존 오버레이 제거
        overlaysRef.current.forEach((o: unknown) => {
          (o as { setMap: (m: null) => void }).setMap(null);
        });
        overlaysRef.current = [];

        // 아파트별 커스텀 오버레이 (리치고 스타일 마커)
        data.apartments.forEach((apt) => {
          const color = getPriceColor(apt.price);
          const priceText = formatPrice(apt.price);
          const changeSign = apt.change >= 0 ? "+" : "";
          const changeColor = apt.change >= 0 ? "#ef4444" : "#3b82f6";

          const content = document.createElement("div");
          content.innerHTML = `
            <div style="cursor:pointer; display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
              <div style="
                padding: 4px 10px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 700;
                color: white;
                background: ${apt.price >= 500000 ? '#ef4444' : apt.price >= 300000 ? '#f97316' : '#3b82f6'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                white-space: nowrap;
                line-height: 1.3;
                text-align: center;
                min-width: 50px;
              ">
                <div style="font-size:11px; opacity:0.85;">${escapeHtml(apt.area)}평</div>
                <div>${escapeHtml(priceText)}</div>
                <div style="font-size:10px; color:${changeColor}; background:rgba(255,255,255,0.2); border-radius:4px; padding:1px 4px; margin-top:2px;">
                  ${escapeHtml(changeSign)}${escapeHtml(apt.change)}%
                </div>
              </div>
              <div style="
                width: 0; height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid ${apt.price >= 500000 ? '#ef4444' : apt.price >= 300000 ? '#f97316' : '#3b82f6'};
              "></div>
            </div>
          `;

          content.addEventListener("click", () => {
            setSelectedApt(apt);
          });

          const position = new window.kakao.maps.LatLng(apt.lat, apt.lng);
          const overlay = new window.kakao.maps.CustomOverlay({
            position,
            content,
            yAnchor: 1,
          });
          overlay.setMap(kakaoMapRef.current);
          overlaysRef.current.push(overlay);
        });
      });
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      setTimeout(initMap, 2000);
    }
  }, [data]);

  // 가격 Top 5 (좌측 패널)
  const topApts = data?.apartments
    ? [...data.apartments].sort((a, b) => b.price - a.price).slice(0, 5)
    : [];

  // 상승률 Top 5
  const topChanges = data?.apartments
    ? [...data.apartments].sort((a, b) => b.change - a.change).slice(0, 5)
    : [];

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:flex-row">
      {/* 좌측 패널 */}
      <div className="w-full shrink-0 overflow-y-auto border-b border-gray-200 bg-white p-4 lg:w-[380px] lg:border-b-0 lg:border-r">
        {/* 구 선택 + 필터 */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => setShowGuDropdown(!showGuDropdown)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                {selectedGu}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showGuDropdown && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {SEOUL_GUS.map((gu) => (
                  <button
                    key={gu}
                    onClick={() => { setSelectedGu(gu); setShowGuDropdown(false); }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 ${gu === selectedGu ? "bg-indigo-50 font-semibold text-indigo-600" : ""}`}
                  >
                    {gu}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex rounded-lg border border-gray-300">
            <button
              onClick={() => setTradeType("매매")}
              className={`px-3 py-2 text-xs font-medium ${tradeType === "매매" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"} rounded-l-lg`}
            >
              매매
            </button>
            <button
              onClick={() => setTradeType("전세")}
              className={`px-3 py-2 text-xs font-medium ${tradeType === "전세" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"} rounded-r-lg`}
            >
              전세
            </button>
          </div>
        </div>

        {/* 상승 예측 TOP */}
        <div className="mb-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-900">
            {selectedGu}, 2년 뒤 가장 상승할 아파트는?
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/60" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {topChanges.map((apt, i) => (
                <button
                  key={apt.name}
                  onClick={() => setSelectedApt(apt)}
                  className={`flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left shadow-sm transition hover:shadow-md ${selectedApt?.name === apt.name ? "ring-2 ring-indigo-500" : ""}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{apt.name}</p>
                    <p className="text-xs text-gray-500">{apt.area}평 · {apt.year}년</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatPrice(apt.price)}</p>
                    <p className={`text-xs font-semibold ${apt.change >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {apt.change >= 0 ? "+" : ""}{apt.change}% 예상
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 선택된 아파트 상세 */}
        {selectedApt && (
          <div className="rounded-xl border border-indigo-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">{selectedApt.name}</h4>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${selectedApt.change >= 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                {selectedApt.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {selectedApt.change >= 0 ? "+" : ""}{selectedApt.change}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-gray-500">현재 시세</p>
                <p className="text-sm font-bold text-gray-900">{formatPrice(selectedApt.price)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-gray-500">전용면적</p>
                <p className="text-sm font-bold text-gray-900">{selectedApt.area}평</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-gray-500">건축년도</p>
                <p className="text-sm font-bold text-gray-900">{selectedApt.year}년</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-gray-500">법정동</p>
                <p className="text-sm font-bold text-gray-900">{selectedApt.dong}</p>
              </div>
            </div>
            <a
              href={`/rights?address=${encodeURIComponent(`서울특별시 ${selectedGu} ${selectedApt.dong}`)}`}
              className="mt-3 block w-full rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-700"
            >
              이 아파트 안전도 분석하기 →
            </a>
          </div>
        )}

        {/* 시세 TOP 5 */}
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {selectedGu} 시세 TOP 5
          </h3>
          {topApts.map((apt, i) => (
            <button
              key={apt.name}
              onClick={() => setSelectedApt(apt)}
              className="flex w-full items-center justify-between border-b border-gray-100 py-2.5 text-left last:border-0 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.name}</p>
                  <p className="text-xs text-gray-500">{apt.dong} · {apt.area}평</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatPrice(apt.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80">
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <span className="text-sm text-gray-600">시세 데이터 로딩 중...</span>
            </div>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />

        {/* 범례 */}
        <div className="absolute bottom-4 right-4 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-gray-700">시세 범례</p>
          <div className="space-y-1">
            {[
              { color: "bg-red-500", label: "50억 이상" },
              { color: "bg-orange-500", label: "30~50억" },
              { color: "bg-blue-600", label: "20~30억" },
              { color: "bg-blue-500", label: "10~20억" },
              { color: "bg-sky-400", label: "10억 미만" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${color}`} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 총 건수 */}
        <div className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-1.5 shadow backdrop-blur-sm">
          <span className="text-xs text-gray-600">
            <span className="font-bold text-indigo-600">{data?.total || 0}</span>개 아파트 표시 중
          </span>
        </div>
      </div>
    </div>
  );
}
