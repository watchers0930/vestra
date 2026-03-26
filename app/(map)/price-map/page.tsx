"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { formatPrice, escapeHtml } from "@/lib/format";

/* ─── 타입 ─── */
interface AptData {
  name: string;
  dong: string;
  price: number;
  area: number;
  lat: number;
  lng: number;
  change: number | null;
  year: number;
}

/* ─── 위험도 분석 ─── */
interface RiskItem {
  label: string;
  level: "안전" | "주의" | "위험";
  value: string;
  detail: string;
}

function analyzeRisk(apt: AptData): { score: number; grade: string; color: string; items: RiskItem[] } {
  const items: RiskItem[] = [];
  let riskScore = 0;

  // 1. 시세 변동 위험
  const change = apt.change ?? 0;
  if (change <= -10) {
    items.push({ label: "시세 변동", level: "위험", value: `${change}%`, detail: "최근 1년 시세가 10% 이상 하락했습니다" });
    riskScore += 30;
  } else if (change <= -5) {
    items.push({ label: "시세 변동", level: "주의", value: `${change}%`, detail: "최근 1년 시세가 5% 이상 하락했습니다" });
    riskScore += 15;
  } else {
    items.push({ label: "시세 변동", level: "안전", value: `${change >= 0 ? "+" : ""}${change}%`, detail: "시세가 안정적이거나 상승 중입니다" });
  }

  // 2. 건물 노후도
  const age = new Date().getFullYear() - apt.year;
  if (age >= 30) {
    items.push({ label: "건물 연식", level: "위험", value: `${age}년 (${apt.year}년 준공)`, detail: "30년 이상 노후 건물로 재건축 가능성 검토 필요" });
    riskScore += 25;
  } else if (age >= 20) {
    items.push({ label: "건물 연식", level: "주의", value: `${age}년 (${apt.year}년 준공)`, detail: "20년 이상 경과, 시설 노후화 확인 필요" });
    riskScore += 10;
  } else {
    items.push({ label: "건물 연식", level: "안전", value: `${age}년 (${apt.year}년 준공)`, detail: "비교적 신축 건물입니다" });
  }

  // 3. 평당가 적정성 (서울 평균 대비)
  const pricePerPyeong = apt.price / apt.area;
  if (pricePerPyeong > 8000) {
    items.push({ label: "평당가", level: "주의", value: `${Math.round(pricePerPyeong).toLocaleString()}만원/평`, detail: "고가 매물로 가격 변동 리스크가 큽니다" });
    riskScore += 10;
  } else if (pricePerPyeong < 2000) {
    items.push({ label: "평당가", level: "주의", value: `${Math.round(pricePerPyeong).toLocaleString()}만원/평`, detail: "주변 시세 대비 낮은 가격, 원인 확인 필요" });
    riskScore += 15;
  } else {
    items.push({ label: "평당가", level: "안전", value: `${Math.round(pricePerPyeong).toLocaleString()}만원/평`, detail: "적정 가격 범위입니다" });
  }

  // 4. 소형 평수 전세 리스크
  if (apt.area <= 20) {
    items.push({ label: "면적 리스크", level: "주의", value: `${apt.area}평`, detail: "소형 평수는 전세보증금 반환 리스크가 높을 수 있습니다" });
    riskScore += 10;
  } else {
    items.push({ label: "면적", level: "안전", value: `${apt.area}평`, detail: "일반적인 면적대입니다" });
  }

  // 종합 등급
  const totalScore = Math.min(100, riskScore);
  const safeScore = 100 - totalScore;
  let grade: string, color: string;
  if (safeScore >= 80) { grade = "양호"; color = "#22c55e"; }
  else if (safeScore >= 60) { grade = "보통"; color = "#f59e0b"; }
  else if (safeScore >= 40) { grade = "주의"; color = "#f97316"; }
  else { grade = "위험"; color = "#ef4444"; }

  return { score: safeScore, grade, color, items };
}

interface MapResponse {
  gu: string;
  apartments: AptData[];
  center: { lat: number; lng: number };
  availableGus: string[];
  regionGroups: Record<string, string[]>;
  total: number;
}

/* ─── 유틸 ─── */
function getAreaColor(area: number): string {
  if (area >= 60) return "#1e3a5f";
  if (area >= 50) return "#1e40af";
  if (area >= 40) return "#2563eb";
  if (area >= 30) return "#3b82f6";
  return "#93c5fd";
}

/* ─── 시도 → 시군구 매핑 ─── */
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

/* ─── 메인 컴포넌트 ─── */
export default function PriceMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  // Kakao Maps SDK does not provide TypeScript type definitions,
  // so we use `any` for map instance refs.
  const kakaoMapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);

  const [data, setData] = useState<MapResponse | null>(null);
  const [selectedGu, setSelectedGu] = useState("강남구");
  const [selectedApt, setSelectedApt] = useState<AptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuDropdown, setShowGuDropdown] = useState(false);
  const [selectedSido, setSelectedSido] = useState("서울");
  const [tradeType, setTradeType] = useState<"매매" | "전세">("매매");
  const [riskPopup, setRiskPopup] = useState<{ apt: AptData; risk: ReturnType<typeof analyzeRisk> } | null>(null);

  /* ─── 아파트 선택 → 지도 이동 + 반경 원 ─── */
  const selectAndMoveToApt = useCallback((apt: AptData) => {
    setSelectedApt(apt);
    const map = kakaoMapRef.current;
    if (!map || !window.kakao?.maps?.LatLng) return;

    const maps = window.kakao.maps;
    const pos = new maps.LatLng(apt.lat, apt.lng);
    map.setCenter(pos);
    map.setLevel(2);

    // 기존 원 제거
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    // 반경 원 표시
    const radii = [
      { radius: 100, color: "#6366f1", opacity: 0.15, strokeWeight: 2 },
      { radius: 200, color: "#818cf8", opacity: 0.10, strokeWeight: 1.5 },
      { radius: 500, color: "#a5b4fc", opacity: 0.06, strokeWeight: 1 },
    ];

    radii.forEach(({ radius, color, opacity, strokeWeight }) => {
      const circle = new maps.Circle({
        center: pos,
        radius,
        strokeWeight,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeStyle: "solid",
        fillColor: color,
        fillOpacity: opacity,
      });
      circle.setMap(map);
      circlesRef.current.push(circle);

      // 반경 라벨
      const labelEl = document.createElement("div");
      labelEl.style.cssText = "font-size:10px;color:#6366f1;font-weight:600;background:white;padding:1px 4px;border-radius:4px;border:1px solid #c7d2fe;opacity:0.9;";
      labelEl.textContent = `${radius}m`;
      const labelPos = new maps.LatLng(apt.lat + radius / 111320, apt.lng);
      const label = new maps.CustomOverlay({ position: labelPos, content: labelEl, yAnchor: 0.5 });
      label.setMap(map);
      circlesRef.current.push(label);
    });
  }, []);

  /* ─── 데이터 fetch ─── */
  const fetchData = useCallback(async (gu: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/price-map?gu=${encodeURIComponent(gu)}&type=${tradeType}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json: MapResponse = await res.json();
      setData(json);
      setSelectedApt(null);
    } catch (err) {
      console.error("시세 데이터 로드 실패:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tradeType]);

  useEffect(() => {
    fetchData(selectedGu);
  }, [selectedGu, fetchData]);

  /* ─── 카카오맵 + 클러스터러 초기화 ─── */
  useEffect(() => {
    if (!data || !mapRef.current) return;
    let cancelled = false;

    const renderMap = () => {
      if (cancelled || !mapRef.current) return;

      const maps = window.kakao.maps;
      const center = new maps.LatLng(data.center.lat, data.center.lng);

      // 맵 생성 — 초기 줌 레벨 7 (타일 로딩 최소화)
      const map = new maps.Map(mapRef.current!, { center, level: 7 });
      kakaoMapRef.current = map;

      // 영역 제한 — 구 경계 밖 타일 로딩 방지
      if (data.apartments.length > 0) {
        const bounds = new maps.LatLngBounds();
        data.apartments.forEach((apt) => bounds.extend(new maps.LatLng(apt.lat, apt.lng)));
        map.setBounds(bounds, 50); // 50px 패딩
      }

      // 줌 레벨 제한 (1~10, 너무 줌아웃 방지)
      map.setMinLevel(1);
      map.setMaxLevel(10);

      // 기존 클러스터러 제거
      if (clustererRef.current) {
        clustererRef.current.clear();
        clustererRef.current = null;
      }

      // 투명 마커 이미지 (클러스터링 위치 계산용)
      const invisibleImage = new maps.MarkerImage(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        new maps.Size(1, 1),
      );

      // 마커 + 오버레이를 청크 단위로 순차 생성 (UI 블로킹 방지)
      const CHUNK_SIZE = 20;
      const allOverlays: { overlay: any; apt: AptData; position: any }[] = [];
      const allMarkers: any[] = [];

      function createMarkerAndOverlay(apt: AptData) {
        const position = new maps.LatLng(apt.lat, apt.lng);
        const marker = new maps.Marker({ position, image: invisibleImage });

        const priceText = formatPrice(apt.price);
        const bgColor = getAreaColor(apt.area);
        const changeHtml = apt.change !== null
          ? `<div style="font-size:10px;color:#fff;background:rgba(255,255,255,.2);border-radius:4px;padding:1px 4px;margin-top:2px">${apt.change >= 0 ? "+" : ""}${escapeHtml(apt.change)}%</div>`
          : "";

        const content = document.createElement("div");
        content.innerHTML = `<div style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:13px;font-weight:700;color:#fff;background:${bgColor};box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;line-height:1.3;text-align:center;min-width:50px"><div style="font-size:11px;opacity:.85">${escapeHtml(apt.area)}평</div><div>${escapeHtml(priceText)}</div>${changeHtml}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ${bgColor};margin:0 auto"></div>`;
        content.style.cssText = "display:flex;flex-direction:column;align-items:center";
        content.addEventListener("click", () => selectAndMoveToApt(apt));

        const overlay = new maps.CustomOverlay({ position, content, yAnchor: 1.1, map: null });
        allOverlays.push({ overlay, apt, position });
        allMarkers.push(marker);
      }

      // 클러스터러 먼저 생성 (빈 상태)
      const clusterer = new maps.MarkerClusterer({
        map,
        markers: [],
        gridSize: 70,
        minLevel: 5,
        disableClickZoom: false,
        averageCenter: true,
        styles: [
          { width: "44px", height: "44px", background: "rgba(99,102,241,.85)", borderRadius: "50%", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "14px", lineHeight: "44px" },
          { width: "56px", height: "56px", background: "rgba(79,70,229,.85)", borderRadius: "50%", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "15px", lineHeight: "56px" },
          { width: "68px", height: "68px", background: "rgba(55,48,163,.85)", borderRadius: "50%", color: "#fff", textAlign: "center", fontWeight: "700", fontSize: "16px", lineHeight: "68px" },
        ],
      });
      clustererRef.current = clusterer;

      // 순차 로딩: CHUNK_SIZE개씩 requestAnimationFrame으로 나눠 생성
      let chunkIdx = 0;
      const apartments = data.apartments;
      const loadNextChunk = () => {
        if (cancelled || chunkIdx >= apartments.length) {
          // 로딩 완료 — 클러스터러에 전체 마커 추가 + 오버레이 토글 시작
          clusterer.addMarkers(allMarkers);
          updateOverlays();
          return;
        }
        const end = Math.min(chunkIdx + CHUNK_SIZE, apartments.length);
        for (let i = chunkIdx; i < end; i++) {
          createMarkerAndOverlay(apartments[i]);
        }
        chunkIdx = end;
        requestAnimationFrame(loadNextChunk);
      };
      requestAnimationFrame(loadNextChunk);

      // 뷰포트 기반 오버레이 토글 — 화면 밖 오버레이 제거로 DOM 최소화
      const DETAIL_LEVEL = 4;
      let visibleOverlays = new Set<number>();

      const updateOverlays = () => {
        const level = map.getLevel();
        if (level <= DETAIL_LEVEL) {
          clusterer.setMap(null);
          const bounds = map.getBounds();
          const newVisible = new Set<number>();

          allOverlays.forEach(({ overlay, position }, idx) => {
            if (bounds.contain(position)) {
              if (!visibleOverlays.has(idx)) overlay.setMap(map);
              newVisible.add(idx);
            } else {
              if (visibleOverlays.has(idx)) overlay.setMap(null);
            }
          });
          visibleOverlays.forEach((idx) => {
            if (!newVisible.has(idx)) allOverlays[idx].overlay.setMap(null);
          });
          visibleOverlays = newVisible;
        } else {
          visibleOverlays.forEach((idx) => allOverlays[idx].overlay.setMap(null));
          visibleOverlays = new Set();
          clusterer.setMap(map);
        }
      };

      maps.event.addListener(map, "zoom_changed", updateOverlays);
      maps.event.addListener(map, "dragend", updateOverlays);

      // 반경 원 초기화
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };

    /* SDK 로딩 대기 */
    const tryInit = () => {
      if (cancelled || !mapRef.current) return false;

      // 이미 완전 로드 — 클라이언트 네비게이션 재진입
      if (typeof window.kakao?.maps?.LatLng === "function" && typeof window.kakao?.maps?.MarkerClusterer === "function") {
        renderMap();
        return true;
      }

      // SDK 있지만 서브리소스 미로드
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          if (!cancelled && mapRef.current && typeof window.kakao.maps.LatLng === "function") {
            renderMap();
          }
        });
        return true;
      }

      return false;
    };

    let rendered = false;
    const pollId = setInterval(() => {
      if (rendered) return;
      if (tryInit()) { rendered = true; clearInterval(pollId); }
    }, 300);
    if (tryInit()) { rendered = true; clearInterval(pollId); }

    const timeoutId = setTimeout(() => clearInterval(pollId), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearTimeout(timeoutId);
      // 정리
      if (clustererRef.current) { clustererRef.current.clear(); clustererRef.current = null; }
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
      kakaoMapRef.current = null;
    };
  }, [data, selectAndMoveToApt]);

  /* ─── 파생 데이터 ─── */
  const topChanges = data?.apartments
    ? [...data.apartments].filter((a) => a.change !== null).sort((a, b) => (b.change as number) - (a.change as number)).slice(0, 5)
    : [];

  /* ─── 렌더 ─── */
  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-row">
        {/* 좌측 패널 */}
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
            <h3 className="mb-2 text-xs font-bold text-gray-900">{selectedGu}, 최근 1년 시세 변동 TOP</h3>
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
                      <p className={`text-[10px] font-semibold ${(apt.change ?? 0) >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        {apt.change !== null ? `${apt.change >= 0 ? "+" : ""}${apt.change}%` : "-"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 아파트 상세 */}
          {selectedApt && (
            <div className="rounded-xl border border-indigo-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">{selectedApt.name}</h4>
                {selectedApt.change !== null ? (
                  <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedApt.change >= 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                    {selectedApt.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {selectedApt.change >= 0 ? "+" : ""}{selectedApt.change}%
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">데이터 부족</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">시세</p><p className="text-xs font-bold">{formatPrice(selectedApt.price)}</p></div>
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">면적</p><p className="text-xs font-bold">{selectedApt.area}평</p></div>
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">건축</p><p className="text-xs font-bold">{selectedApt.year}년</p></div>
                <div className="rounded bg-gray-50 p-1.5"><p className="text-gray-500">법정동</p><p className="text-xs font-bold">{selectedApt.dong}</p></div>
              </div>
              <button
                onClick={() => setRiskPopup({ apt: selectedApt, risk: analyzeRisk(selectedApt) })}
                className="mt-2 block w-full rounded-lg bg-indigo-600 py-1.5 text-center text-[11px] font-semibold text-white hover:bg-indigo-700 cursor-pointer"
              >
                위험도 분석 →
              </button>
            </div>
          )}
        </div>

        {/* 위험도 분석 레이어 팝업 */}
        {riskPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRiskPopup(null)}>
            <div className="w-[420px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{riskPopup.apt.name}</h3>
                  <p className="text-xs text-gray-500">{riskPopup.apt.dong} · {riskPopup.apt.area}평 · {riskPopup.apt.year}년</p>
                </div>
                <button onClick={() => setRiskPopup(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* 종합 점수 */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={riskPopup.risk.color} strokeWidth="3" strokeDasharray={`${riskPopup.risk.score} ${100 - riskPopup.risk.score}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: riskPopup.risk.color }}>{riskPopup.risk.score}</span>
                    <span className="text-[9px] text-gray-400">/ 100</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">종합 안전 점수</p>
                  <p className="text-xl font-bold" style={{ color: riskPopup.risk.color }}>{riskPopup.risk.grade}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">공공데이터 기반 자동 분석 결과</p>
                </div>
              </div>

              {/* 항목별 분석 */}
              <div className="border-t border-gray-100 px-6 py-4">
                <h4 className="mb-3 text-xs font-bold text-gray-700">항목별 분석</h4>
                <div className="space-y-3">
                  {riskPopup.risk.items.map((item) => (
                    <div key={item.label} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.level === "안전" ? "bg-green-100 text-green-700" :
                          item.level === "주의" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>{item.level}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900">{item.value}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 하단 안내 */}
              <div className="border-t border-gray-100 px-6 py-4">
                <p className="text-[10px] text-gray-400 text-center">
                  ※ 본 분석은 공공데이터 기반 자동 산출 결과이며, 투자 판단의 근거로 사용할 수 없습니다.
                  정확한 분석을 위해 등기부등본 확인을 권장합니다.
                </p>
                <a
                  href={`/rights?address=${encodeURIComponent(`서울특별시 ${selectedGu} ${riskPopup.apt.dong}`)}`}
                  className="mt-3 block w-full rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                >
                  등기부등본으로 정밀 분석하기 →
                </a>
              </div>
            </div>
          </div>
        )}

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
