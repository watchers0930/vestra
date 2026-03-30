"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Train, GraduationCap, ShoppingCart, Building2, ChevronDown, ChevronRight, Loader2, Sparkles, Navigation, Search } from "lucide-react";

/* ── types ── */
interface FacilityItem {
  name: string;
  distance: number;
  lat: number;
  lng: number;
  address: string;
}

interface CategoryData {
  score: number;
  grade: string;
  count: number;
  nearest: number;
  items: FacilityItem[];
}

interface AnalysisResult {
  address: string;
  lat: number;
  lng: number;
  categories: {
    transport: CategoryData;
    education: CategoryData;
    convenience: CategoryData;
    living: CategoryData;
  };
  totalScore: number;
  totalGrade: string;
  aiComment: string;
}

const CATEGORY_META = [
  { key: "transport" as const, label: "교통", icon: Train, color: "#3b82f6", weight: "30%" },
  { key: "education" as const, label: "교육", icon: GraduationCap, color: "#8b5cf6", weight: "25%" },
  { key: "convenience" as const, label: "편의시설", icon: ShoppingCart, color: "#10b981", weight: "25%" },
  { key: "living" as const, label: "생활", icon: Building2, color: "#f59e0b", weight: "20%" },
];

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function formatDistance(m: number) {
  if (m === 0) return "-";
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

/* ── page ── */
export default function NeighborhoodMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vestra_last_address");
      if (saved) setAddress(saved);
    } catch { /* ignore */ }
  }, []);

  const toggleCat = (key: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* ── 분석 실행 ── */
  const handleAnalyze = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      localStorage.setItem("vestra_last_address", address);
      const res = await fetch("/api/neighborhood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "분석에 실패했습니다.");
        return;
      }
      setResult(json);
      setExpandedCats(new Set(CATEGORY_META.map(c => c.key)));
      setActiveFilter(null);
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ── 카카오맵 초기화 (빈 지도) ── */
  useEffect(() => {
    const tryInit = () => {
      if (!mapRef.current) return false;
      const w = window as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!w.kakao?.maps?.LatLng) {
        if (w.kakao?.maps?.load) {
          w.kakao.maps.load(() => initMap());
          return true;
        }
        return false;
      }
      initMap();
      return true;
    };

    const initMap = () => {
      if (!mapRef.current) return;
      const maps = (window as any).kakao.maps; // eslint-disable-line @typescript-eslint/no-explicit-any
      const center = new maps.LatLng(37.5665, 126.9780); // 서울 시청
      const map = new maps.Map(mapRef.current, { center, level: 8 });
      kakaoMapRef.current = map;
    };

    let rendered = false;
    const pollId = setInterval(() => {
      if (rendered) return;
      if (tryInit()) { rendered = true; clearInterval(pollId); }
    }, 300);
    if (tryInit()) { rendered = true; clearInterval(pollId); }
    const tid = setTimeout(() => clearInterval(pollId), 15000);
    return () => { clearInterval(pollId); clearTimeout(tid); };
  }, []);

  /* ── 분석 결과 → 지도에 마커 표시 ── */
  const renderMarkers = useCallback(() => {
    if (!result || !kakaoMapRef.current) return;
    const maps = (window as any).kakao.maps; // eslint-disable-line @typescript-eslint/no-explicit-any
    const map = kakaoMapRef.current;

    // 중심 이동
    const center = new maps.LatLng(result.lat, result.lng);
    map.setCenter(center);
    map.setLevel(5);

    // 기존 오버레이 제거 (맵 리셋)
    // 반경 원
    const circle = new maps.Circle({
      map, center, radius: 1000,
      strokeWeight: 2, strokeColor: "#6366f1", strokeOpacity: 0.4,
      fillColor: "#6366f1", fillOpacity: 0.06,
    });

    // 중심 마커
    new maps.Marker({ map, position: center, zIndex: 10 });

    const colorMap: Record<string, string> = {
      transport: "#3b82f6", education: "#8b5cf6",
      convenience: "#10b981", living: "#f59e0b",
    };

    // 시설 마커
    for (const cat of CATEGORY_META) {
      if (activeFilter && activeFilter !== cat.key) continue;
      const data = result.categories[cat.key];
      const color = colorMap[cat.key];
      for (const item of data.items.slice(0, 8)) {
        const pos = new maps.LatLng(item.lat, item.lng);
        const content = document.createElement("div");
        content.innerHTML = `<div style="background:${color};color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid #fff;cursor:pointer">${item.name.length > 8 ? item.name.slice(0, 8) + "…" : item.name}</div>`;
        new maps.CustomOverlay({ map, position: pos, content, yAnchor: 1.3 });
      }
    }

    return () => { circle.setMap(null); };
  }, [result, activeFilter]);

  useEffect(() => {
    if (result) renderMarkers();
  }, [result, renderMarkers]);

  /* ── 카테고리 필터 토글 ── */
  const toggleFilter = (key: string) => {
    setActiveFilter(prev => prev === key ? null : key);
  };

  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-row">
        {/* ── 좌측 패널 ── */}
        <div className="h-full w-[320px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white" style={{ padding: "8px" }}>
          {/* 주소 입력 */}
          <div className="mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAnalyze(); }}
                  placeholder="주소 입력 (예: 서울 강남구 역삼동)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading || !address.trim()}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "분석"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <p className="text-xs text-gray-500">주변 환경 분석 중...</p>
            </div>
          )}

          {/* 분석 결과 */}
          {result && !loading && (
            <>
              {/* 종합 점수 */}
              <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${getScoreColor(result.totalScore)} ${result.totalScore * 3.6}deg, #e5e7eb 0deg)` }}>
                    <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                      <span className="text-lg font-bold" style={{ color: getScoreColor(result.totalScore) }}>{result.totalScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{result.totalGrade} 등급</p>
                    <p className="text-[11px] text-gray-500 truncate" style={{ maxWidth: 180 }}>{result.address}</p>
                  </div>
                </div>
                {/* 카테고리 배지 */}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_META.map(c => {
                    const cat = result.categories[c.key];
                    const isActive = activeFilter === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggleFilter(c.key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${isActive ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100"}`}
                        style={{ backgroundColor: `${c.color}20`, color: c.color, outlineColor: isActive ? c.color : undefined }}
                      >
                        <c.icon size={12} />
                        {c.label} {cat.score}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI 코멘트 */}
              {result.aiComment && (
                <div className="mb-3 flex gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <Sparkles size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-700 leading-relaxed">{result.aiComment}</p>
                </div>
              )}

              {/* 카테고리별 상세 */}
              {CATEGORY_META.map(c => {
                const cat = result.categories[c.key];
                const Icon = c.icon;
                const expanded = expandedCats.has(c.key);
                return (
                  <div key={c.key} className="mb-2 rounded-lg border border-gray-200 overflow-hidden">
                    <button onClick={() => toggleCat(c.key)} className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}>
                        <Icon size={14} style={{ color: c.color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-900">{c.label}</span>
                          <span className="text-[10px] text-gray-400">{c.weight}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, backgroundColor: getScoreColor(cat.score) }} />
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${c.color}15`, color: c.color }}>{cat.grade}</span>
                      {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    </button>

                    {expanded && (
                      <div className="px-3 pb-2.5 border-t border-gray-100">
                        <div className="flex items-center gap-3 py-2 text-[10px] text-gray-500">
                          <span>시설 <b className="text-gray-900">{cat.count}개</b></span>
                          <span>최근접 <b className="text-gray-900">{formatDistance(cat.nearest)}</b></span>
                        </div>
                        {cat.items.length === 0 ? (
                          <p className="text-[11px] text-gray-400 py-1">반경 1km 내 시설 없음</p>
                        ) : (
                          <div className="space-y-0.5">
                            {cat.items.slice(0, 6).map((item, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  if (kakaoMapRef.current) {
                                    const maps = (window as any).kakao.maps; // eslint-disable-line @typescript-eslint/no-explicit-any
                                    kakaoMapRef.current.setCenter(new maps.LatLng(item.lat, item.lng));
                                    kakaoMapRef.current.setLevel(3);
                                  }
                                }}
                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-left"
                              >
                                <Navigation size={10} className="text-gray-300 shrink-0" />
                                <span className="text-[11px] text-gray-800 truncate flex-1">{item.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono shrink-0">{formatDistance(item.distance)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* 빈 상태 */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin size={28} className="text-indigo-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">주변 환경 분석</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">주소를 입력하면<br />교통·교육·편의·생활 환경을<br />AI가 종합 분석합니다</p>
            </div>
          )}
        </div>

        {/* ── 오른쪽: 카카오맵 ── */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="h-full w-full" />

          {/* 지도 위 범례 */}
          {result && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3">
              <p className="text-[10px] font-bold text-gray-500 mb-2">범례</p>
              <div className="space-y-1.5">
                {CATEGORY_META.map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-[11px] text-gray-700">{c.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <div className="w-3 h-3 rounded-full border-2 border-indigo-400 bg-indigo-100" />
                  <span className="text-[11px] text-gray-700">반경 1km</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
