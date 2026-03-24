"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";

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

function formatPrice(price: number): string {
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const remainder = Math.round((price % 10000) / 1000);
    return remainder > 0 ? `${eok}.${remainder}억` : `${eok}억`;
  }
  return `${(price / 10000).toFixed(1)}억`;
}

function escapeHtml(str: string | number): string {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );
}

// 시도 → 시군구 매핑
const SIDO_MAP: Record<string, string[]> = {
  "서울": ["강남구", "서초구", "송파구", "강동구", "마포구", "용산구", "성동구", "광진구", "영등포구", "동작구", "양천구", "강서구", "구로구", "금천구", "관악구", "노원구", "도봉구", "강북구", "성북구", "동대문구", "중랑구", "종로구", "은평구", "서대문구", "중구"],
  "경기": ["분당구", "수원영통구", "용인수지구", "화성동탄", "고양일산동구", "하남시", "과천시"],
  "부산": ["해운대구", "수영구", "부산진구", "동래구"],
  "대구": ["수성구", "달서구"],
  "인천": ["연수구", "부평구", "남동구"],
  "대전": ["유성구", "서구(대전)"],
  "광주": ["광산구", "남구(광주)"],
  "울산": ["남구(울산)", "울주군"],
};

export default function PriceMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<unknown>(null);
  const overlaysRef = useRef<unknown[]>([]);
  const circlesRef = useRef<unknown[]>([]);
  const [data, setData] = useState<MapResponse | null>(null);
  const [selectedGu, setSelectedGu] = useState("강남구");
  const [selectedApt, setSelectedApt] = useState<AptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuDropdown, setShowGuDropdown] = useState(false);
  const [selectedSido, setSelectedSido] = useState("서울");
  const [tradeType, setTradeType] = useState<"매매" | "전세">("매매");

  // 아파트 선택 시 지도 이동 + 반경 원 표시
  const selectAndMoveToApt = useCallback((apt: AptData) => {
    setSelectedApt(apt);
    if (!kakaoMapRef.current || !window.kakao?.maps?.LatLng) return;

    const maps = window.kakao.maps;
    const pos = new maps.LatLng(apt.lat, apt.lng);
    (kakaoMapRef.current as { setCenter: (p: unknown) => void }).setCenter(pos);
    (kakaoMapRef.current as { setLevel: (l: number) => void }).setLevel(2);

    // 기존 원 제거
    circlesRef.current.forEach((c: unknown) => {
      (c as { setMap: (m: null) => void }).setMap(null);
    });
    circlesRef.current = [];

    // 100m, 200m, 500m 반경 원
    const radii = [
      { radius: 100, color: "#6366f1", opacity: 0.15, strokeWeight: 2 },
      { radius: 200, color: "#818cf8", opacity: 0.10, strokeWeight: 1.5 },
      { radius: 500, color: "#a5b4fc", opacity: 0.06, strokeWeight: 1 },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const KakaoCircle = (maps as any).Circle;
    radii.forEach(({ radius, color, opacity, strokeWeight }) => {
      const circle = new KakaoCircle({
        center: pos,
        radius,
        strokeWeight,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeStyle: "solid",
        fillColor: color,
        fillOpacity: opacity,
      });
      circle.setMap(kakaoMapRef.current);
      circlesRef.current.push(circle);

      // 반경 라벨 (CustomOverlay)
      const labelContent = document.createElement("div");
      labelContent.style.cssText = "font-size:10px;color:#6366f1;font-weight:600;background:white;padding:1px 4px;border-radius:4px;border:1px solid #c7d2fe;opacity:0.9;";
      labelContent.textContent = `${radius}m`;
      // 원 상단에 라벨 배치
      const labelPos = new maps.LatLng(apt.lat + (radius / 111320), apt.lng);
      const label = new maps.CustomOverlay({ position: labelPos, content: labelContent, yAnchor: 0.5 });
      label.setMap(kakaoMapRef.current);
      circlesRef.current.push(label);
    });
  }, []);

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

  // 카카오맵 초기화 — SDK 로드 완료 후 렌더
  useEffect(() => {
    if (!data || !mapRef.current) return;
    let cancelled = false;

    const renderMap = () => {
      if (cancelled || !mapRef.current) return;

      const { maps } = window.kakao;
      const center = new maps.LatLng(data.center.lat, data.center.lng);

      // 맵 인스턴스 재사용 or 생성
      if (!kakaoMapRef.current) {
        kakaoMapRef.current = new maps.Map(mapRef.current!, { center, level: 5 });
      } else {
        (kakaoMapRef.current as { setCenter: (c: unknown) => void }).setCenter(center);
      }

      // 기존 오버레이 제거
      overlaysRef.current.forEach((o: unknown) => {
        (o as { setMap: (m: null) => void }).setMap(null);
      });
      overlaysRef.current = [];

      // 마커 생성
      data.apartments.forEach((apt) => {
        const priceText = formatPrice(apt.price);
        const changeSign = apt.change >= 0 ? "+" : "";
        // 평형대별 연한→진한 파랑
        const bgColor = apt.area >= 60 ? '#1e3a5f' : apt.area >= 50 ? '#1e40af' : apt.area >= 40 ? '#2563eb' : apt.area >= 30 ? '#3b82f6' : '#93c5fd';

        const content = document.createElement("div");
        content.innerHTML = `
          <div style="cursor:pointer; display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
            <div style="padding:4px 10px; border-radius:8px; font-size:13px; font-weight:700; color:white; background:${bgColor}; box-shadow:0 2px 8px rgba(0,0,0,0.25); white-space:nowrap; line-height:1.3; text-align:center; min-width:50px;">
              <div style="font-size:11px; opacity:0.85;">${escapeHtml(apt.area)}평</div>
              <div>${escapeHtml(priceText)}</div>
              <div style="font-size:10px; color:#ffffff; background:rgba(255,255,255,0.2); border-radius:4px; padding:1px 4px; margin-top:2px;">
                ${escapeHtml(changeSign)}${escapeHtml(apt.change)}%
              </div>
            </div>
            <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid ${bgColor};"></div>
          </div>
        `;
        content.addEventListener("click", () => selectAndMoveToApt(apt));

        const position = new maps.LatLng(apt.lat, apt.lng);
        const overlay = new maps.CustomOverlay({ position, content, yAnchor: 1 });
        overlay.setMap(kakaoMapRef.current);
        overlaysRef.current.push(overlay);
      });
    };

    const tryInit = () => {
      if (cancelled || !mapRef.current) return false;
      if (!window.kakao?.maps?.load) return false;

      window.kakao.maps.load(() => {
        if (!cancelled && mapRef.current) {
          // LatLng 존재 여부로 실제 로드 완료 확인
          if (typeof window.kakao.maps.LatLng === "function") {
            renderMap();
          }
        }
      });
      return true;
    };

    // 폴링으로 통일 — 즉시 + 반복 시도 (웨일/크롬 모두 안정적)
    const pollId = setInterval(() => {
      if (tryInit()) clearInterval(pollId);
    }, 200);
    tryInit(); // 즉시 1회 시도

    const timeoutId = setTimeout(() => clearInterval(pollId), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearTimeout(timeoutId);
    };
  }, [data, selectAndMoveToApt]);

  const topChanges = data?.apartments
    ? [...data.apartments].sort((a, b) => b.change - a.change).slice(0, 5)
    : [];

  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-row">
        {/* 좌측 패널 (사이드바와 지도 사이) */}
        <div className="h-full w-[280px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white pr-3 py-1" style={{ paddingLeft: "4px" }}>
          {/* 구 선택 + 필터 */}
          <div className="mb-3 flex items-center gap-2">
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
                <div className="absolute z-20 mt-1 flex rounded-lg border border-gray-200 bg-white shadow-lg" style={{ width: "360px" }}>
                  {/* 시도 열 */}
                  <div className="w-[100px] shrink-0 border-r border-gray-100 overflow-y-auto max-h-64">
                    <p className="sticky top-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">시도</p>
                    {Object.keys(SIDO_MAP).map((sido) => (
                      <button
                        key={sido}
                        onClick={() => setSelectedSido(sido)}
                        className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-indigo-50 ${sido === selectedSido ? "bg-indigo-100 font-bold text-indigo-600" : "text-gray-700"}`}
                      >
                        {sido}
                      </button>
                    ))}
                  </div>
                  {/* 시군구 열 */}
                  <div className="flex-1 overflow-y-auto max-h-64">
                    <p className="sticky top-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">시군구</p>
                    {(SIDO_MAP[selectedSido] || []).map((gu) => (
                      <button
                        key={gu}
                        onClick={() => { setSelectedGu(gu); setShowGuDropdown(false); }}
                        className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-indigo-50 ${gu === selectedGu ? "bg-indigo-50 font-semibold text-indigo-600" : "text-gray-700"}`}
                      >
                        {gu}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex rounded-lg border border-gray-300">
              <button onClick={() => setTradeType("매매")} className={`px-3 py-2 text-xs font-medium ${tradeType === "매매" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"} rounded-l-lg`}>매매</button>
              <button onClick={() => setTradeType("전세")} className={`px-3 py-2 text-xs font-medium ${tradeType === "전세" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"} rounded-r-lg`}>전세</button>
            </div>
          </div>

          {/* 상승 예측 TOP */}
          <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 p-3">
            <h3 className="mb-2 text-xs font-bold text-gray-900">{selectedGu}, 2년 뒤 가장 상승할 아파트는?</h3>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white/60" />)}</div>
            ) : (
              <div className="space-y-1.5">
                {topChanges.map((apt, i) => (
                  <button
                    key={apt.name}
                    onClick={() => selectAndMoveToApt(apt)}
                    className={`flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left shadow-sm transition hover:shadow-md ${selectedApt?.name === apt.name ? "ring-2 ring-indigo-500" : ""}`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">{apt.name}</p>
                      <p className="text-[10px] text-gray-500">{apt.area}평 · {apt.year}년</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{formatPrice(apt.price)}</p>
                      <p className={`text-[10px] font-semibold ${apt.change >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        {apt.change >= 0 ? "+" : ""}{apt.change}%
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 아파트 */}
          {selectedApt && (
            <div className="rounded-xl border border-indigo-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">{selectedApt.name}</h4>
                <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedApt.change >= 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                  {selectedApt.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {selectedApt.change >= 0 ? "+" : ""}{selectedApt.change}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">시세</p><p className="text-xs font-bold">{formatPrice(selectedApt.price)}</p></div>
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">면적</p><p className="text-xs font-bold">{selectedApt.area}평</p></div>
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">건축</p><p className="text-xs font-bold">{selectedApt.year}년</p></div>
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">법정동</p><p className="text-xs font-bold">{selectedApt.dong}</p></div>
              </div>
              <a
                href={`/rights?address=${encodeURIComponent(`서울특별시 ${selectedGu} ${selectedApt.dong}`)}`}
                className="mt-2 block w-full rounded-lg bg-indigo-600 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                이 아파트 안전도 분석하기 →
              </a>
            </div>
          )}
        </div>

        {/* 지도 영역 */}
        <div className="relative flex-1" style={{ minHeight: 0 }}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80">
              <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span className="text-sm text-gray-600">시세 데이터 로딩 중...</span>
              </div>
            </div>
          )}
          <div ref={mapRef} className="absolute inset-0" />

          {/* 범례 */}
          <div className="absolute bottom-4 right-4 z-10 rounded-lg border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
            <p className="mb-1 text-[10px] font-semibold text-gray-700">평형대 범례</p>
            <div className="space-y-0.5">
              {[
                { color: "bg-[#1e3a5f]", label: "60평+" },
                { color: "bg-[#1e40af]", label: "50평대" },
                { color: "bg-[#2563eb]", label: "40평대" },
                { color: "bg-[#3b82f6]", label: "30평대" },
                { color: "bg-[#93c5fd]", label: "20평대 이하" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="text-[10px] text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 총 건수 */}
          <div className="absolute left-3 top-3 z-10 rounded-lg bg-white/95 px-2.5 py-1 shadow backdrop-blur-sm">
            <span className="text-xs text-gray-600">
              <span className="font-bold text-indigo-600">{data?.total || 0}</span>개 아파트
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
