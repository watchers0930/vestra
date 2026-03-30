"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Train, GraduationCap, ShoppingCart, Building2, ChevronDown, ChevronRight, Loader2, Sparkles, Navigation } from "lucide-react";
import { ScoreGauge } from "@/components/results/ScoreGauge";
import KakaoScript from "@/components/common/KakaoScript";

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
  if (score >= 80) return "#10b981";
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
export default function NeighborhoodPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

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
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 카카오맵 시설 마커 표시
  const renderMap = useCallback(() => {
    if (!result || !mapRef.current) return;
    const kakao = (window as unknown as Record<string, unknown>).kakao as Record<string, unknown> | undefined;
    if (!kakao?.maps) return;

    const maps = kakao.maps as Record<string, unknown>;
    const LatLng = maps.LatLng as new (lat: number, lng: number) => unknown;
    const Map = maps.Map as new (el: HTMLElement, opts: unknown) => unknown;
    const Marker = maps.Marker as new (opts: unknown) => unknown;
    const Circle = maps.Circle as new (opts: unknown) => unknown;
    const InfoWindow = maps.InfoWindow as new (opts: unknown) => { open: (map: unknown, marker: unknown) => void; close: () => void };

    const center = new LatLng(result.lat, result.lng);
    const map = new Map(mapRef.current!, { center, level: 5 });
    mapInstanceRef.current = map;

    // 반경 1km 원
    new Circle({
      map, center, radius: 1000,
      strokeWeight: 2, strokeColor: "#3b82f6", strokeOpacity: 0.4,
      fillColor: "#3b82f6", fillOpacity: 0.06,
    });

    // 중심 마커
    new Marker({ map, position: center, zIndex: 10 });

    const colorMap: Record<string, string> = {
      transport: "#3b82f6", education: "#8b5cf6",
      convenience: "#10b981", living: "#f59e0b",
    };

    for (const cat of CATEGORY_META) {
      const data = result.categories[cat.key];
      const color = colorMap[cat.key];
      for (const item of data.items.slice(0, 5)) {
        const pos = new LatLng(item.lat, item.lng);
        const marker = new Marker({ map, position: pos });
        const infoWindow = new InfoWindow({
          content: `<div style="padding:8px 12px;font-size:12px;white-space:nowrap"><b style="color:${color}">[${cat.label}]</b> ${item.name}<br/><span style="color:#888">${formatDistance(item.distance)}</span></div>`,
        });

        const m = maps as Record<string, unknown>;
        const event = m.event as { addListener: (target: unknown, type: string, handler: () => void) => void };
        event.addListener(marker, "click", () => {
          infoWindow.open(map, marker);
          setTimeout(() => infoWindow.close(), 3000);
        });
      }
    }
  }, [result]);

  useEffect(() => {
    if (!result) return;
    const tryRender = () => {
      const kakao = (window as unknown as Record<string, unknown>).kakao as Record<string, unknown> | undefined;
      if (kakao?.maps) {
        const maps = kakao.maps as { load?: (cb: () => void) => void };
        if (maps.load) maps.load(renderMap);
        else renderMap();
      } else {
        setTimeout(tryRender, 500);
      }
    };
    tryRender();
  }, [result, renderMap]);

  return (
    <>
      <KakaoScript />
      <div className="space-y-8 pb-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">주변 환경 분석</h1>
          </div>
          <p className="text-gray-500 text-sm">주소를 입력하면 교통, 교육, 편의시설, 생활 환경을 종합 분석합니다</p>
        </div>

        {/* Address Input */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAnalyze(); }}
                placeholder="분석할 주소를 입력하세요 (예: 서울 강남구 역삼동 123)"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !address.trim()}
              className="px-6 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "분석 시작"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">주변 환경을 분석하고 있습니다...</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* 종합 점수 + AI 코멘트 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreGauge score={result.totalScore} size="lg" label="환경 점수" grade={result.totalGrade} scoreType="safety" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{result.address}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {CATEGORY_META.map(c => {
                      const cat = result.categories[c.key];
                      return (
                        <span key={c.key} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                          {c.label} {cat.grade}
                        </span>
                      );
                    })}
                  </div>
                  {result.aiComment && (
                    <div className="flex gap-2 p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 leading-relaxed">{result.aiComment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 카테고리별 상세 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORY_META.map(c => {
                const cat = result.categories[c.key];
                const Icon = c.icon;
                const expanded = expandedCats.has(c.key);
                return (
                  <div key={c.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button onClick={() => toggleCat(c.key)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}>
                        <Icon size={18} style={{ color: c.color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{c.label}</span>
                          <span className="text-xs text-gray-400">가중치 {c.weight}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, backgroundColor: getScoreColor(cat.score) }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: `${c.color}15`, color: c.color }}>{cat.grade}</span>
                      {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </button>

                    {expanded && (
                      <div className="px-5 pb-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 py-3 text-xs text-gray-500">
                          <span>시설 <b className="text-gray-900">{cat.count}개</b></span>
                          <span>최근접 <b className="text-gray-900">{formatDistance(cat.nearest)}</b></span>
                        </div>
                        {cat.items.length === 0 ? (
                          <p className="text-sm text-gray-400 py-2">반경 1km 내 시설 없음</p>
                        ) : (
                          <div className="space-y-1.5">
                            {cat.items.slice(0, 5).map((item, i) => (
                              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <Navigation size={12} className="text-gray-300 shrink-0" />
                                <span className="text-sm text-gray-800 truncate flex-1">{item.name}</span>
                                <span className="text-xs text-gray-400 font-mono shrink-0">{formatDistance(item.distance)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 카카오맵 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">주변 시설 지도</h3>
                <p className="text-xs text-gray-500 mt-1">반경 1km 내 주요 시설 위치 (마커 클릭 시 상세 정보)</p>
              </div>
              <div ref={mapRef} style={{ width: "100%", height: 400 }} />
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center" style={{ marginBottom: 20 }}>
              <MapPin size={36} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900" style={{ marginBottom: 20 }}>주변 환경을 분석해보세요</h3>
            <p className="text-gray-500 text-sm max-w-md">주소를 입력하면 교통, 교육, 편의시설, 생활 환경을 AI가 종합 분석하여 점수와 코멘트를 제공합니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
