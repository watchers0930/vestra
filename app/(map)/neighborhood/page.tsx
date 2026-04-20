"use client";

import {
  MapPin, Train, GraduationCap, ShoppingCart, Building2,
  ChevronDown, ChevronRight, Loader2, Sparkles, Navigation,
  Search, Heart, Eye, EyeOff,
} from "lucide-react";
import { useNeighborhoodData, type FacilityGroup } from "./hooks/useNeighborhoodData";

const CATEGORY_META = [
  { key: "transport"   as const, label: "교통", icon: Train,         color: "#0071e3", weight: "25%" },
  { key: "education"   as const, label: "교육", icon: GraduationCap, color: "#6e3de8", weight: "20%" },
  { key: "medical"     as const, label: "의료", icon: Heart,         color: "#ff3b30", weight: "20%" },
  { key: "convenience" as const, label: "편의", icon: ShoppingCart,  color: "#1a9e45", weight: "15%" },
  { key: "living"      as const, label: "생활", icon: Building2,     color: "#b86f00", weight: "20%" },
];

function getScoreColor(score: number) {
  if (score >= 80) return "#1a9e45";
  if (score >= 60) return "#0071e3";
  if (score >= 40) return "#b86f00";
  return "#ff3b30";
}

function getScoreBg(score: number) {
  if (score >= 80) return "rgba(48,209,88,0.10)";
  if (score >= 60) return "rgba(0,113,227,0.10)";
  if (score >= 40) return "rgba(255,159,10,0.10)";
  return "rgba(255,59,48,0.10)";
}

function formatDistance(m: number) {
  if (m === 0) return "-";
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function NeighborhoodMapPage() {
  const {
    mapRef, address, setAddress,
    loading, result, error,
    expandedCats, visibleFacilities,
    toggleCat, handleAnalyze,
    toggleFacility, toggleAllFacilities, navigateTo,
  } = useNeighborhoodData();

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <div style={{ display: "flex", height: "100%", flexDirection: "row" }}>

        {/* ── 좌측 패널 ── */}
        <div style={{ height: "100%", width: "340px", flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column", background: "#f5f5f7", borderRight: "1px solid rgba(0,0,0,0.08)" }}>

          {/* 다크 헤더 */}
          <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)", flexShrink: 0 }}>
            <div style={{ pointerEvents: "none", position: "absolute", top: "-60px", right: "-20px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
            <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
            <div style={{ position: "relative", zIndex: 1, padding: "22px 20px 18px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "10px" }}>
                <MapPin size={9} strokeWidth={2} /> 주변환경분석
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.2 }}>주변 환경 분석</h2>
              <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.40)", marginTop: "5px", marginBottom: 0, lineHeight: 1.5 }}>
                교통 · 교육 · 의료 · 편의 · 생활 환경을<br />AI가 종합 점수로 분석합니다
              </p>
              {/* 카테고리 칩 */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, marginTop: "14px" }}>
                {CATEGORY_META.map(({ label, icon: Icon, color }) => (
                  <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <Icon size={10} strokeWidth={1.5} style={{ color }} />
                    <span style={{ fontSize: "10.5px", fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 검색 영역 */}
          <div style={{ padding: "14px 14px 10px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={13} strokeWidth={1.5} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#aeaeb2" }} />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
                  placeholder="주소 입력 (예: 서울 강남구 역삼동)"
                  style={{ width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "9px", paddingBottom: "9px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "12.5px", outline: "none", background: "#f5f5f7", color: "#1d1d1f", boxSizing: "border-box" as const }}
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading || !address.trim()}
                style={{ padding: "9px 16px", borderRadius: "10px", border: "none", background: loading || !address.trim() ? "rgba(0,113,227,0.35)" : "#0071e3", color: "#fff", fontSize: "12.5px", fontWeight: 600, cursor: loading || !address.trim() ? "not-allowed" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", transition: "all 0.15s" }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "분석"}
              </button>
            </div>
            {error && <p style={{ marginTop: "8px", fontSize: "11px", color: "#ff3b30" }}>{error}</p>}
          </div>

          {/* 스크롤 컨텐츠 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>

            {/* 로딩 */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "10px" }}>
                <Loader2 size={22} className="animate-spin" style={{ color: "#0071e3" }} />
                <p style={{ fontSize: "12px", color: "#6e6e73" }}>주변 환경 분석 중...</p>
              </div>
            )}

            {/* 분석 결과 */}
            {result && !loading && (
              <>
                {/* 종합 점수 카드 */}
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "16px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                    {/* 원형 점수 */}
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", flexShrink: 0, background: `conic-gradient(${getScoreColor(result.totalScore)} ${result.totalScore * 3.6}deg, #e5e7eb 0deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "17px", fontWeight: 700, color: getScoreColor(result.totalScore) }}>{result.totalScore}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f" }}>{result.totalGrade} 등급</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 9px", borderRadius: "20px", color: getScoreColor(result.totalScore), background: getScoreBg(result.totalScore) }}>
                          {result.totalScore}점
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6e6e73", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{result.address}</p>
                    </div>
                  </div>
                  {/* 카테고리 점수 배지 */}
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                    {CATEGORY_META.map((c) => {
                      const cat = result.categories[c.key];
                      return (
                        <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: `${c.color}14`, color: c.color }}>
                          <c.icon size={10} strokeWidth={1.5} />
                          {c.label} {cat.score}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* AI 코멘트 */}
                {result.aiComment && (
                  <div style={{ display: "flex", gap: "10px", padding: "12px 14px", borderRadius: "14px", background: "rgba(0,113,227,0.05)", border: "1px solid rgba(0,113,227,0.12)", marginBottom: "10px" }}>
                    <Sparkles size={13} strokeWidth={1.5} style={{ color: "#0071e3", flexShrink: 0, marginTop: "1px" }} />
                    <p style={{ fontSize: "11.5px", color: "#3d3d3f", lineHeight: 1.7, margin: 0 }}>{result.aiComment}</p>
                  </div>
                )}

                {/* 시설 표시 토글 */}
                {result.facilities && (
                  <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "14px", padding: "12px 14px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.06em", textTransform: "uppercase" as const, margin: 0 }}>시설 표시</p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => toggleAllFacilities(true)} style={{ fontSize: "10.5px", color: "#0071e3", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>전체 보기</button>
                        <span style={{ color: "#d1d1d6" }}>|</span>
                        <button onClick={() => toggleAllFacilities(false)} style={{ fontSize: "10.5px", color: "#aeaeb2", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>전체 숨기기</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                      {Object.entries(result.facilities).map(([key, fac]) => {
                        const f = fac as FacilityGroup;
                        const visible = visibleFacilities.has(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleFacility(key)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "10.5px", fontWeight: 600, border: `1px solid ${f.color}`, background: visible ? `${f.color}14` : "transparent", color: f.color, cursor: "pointer", opacity: visible ? 1 : 0.4, transition: "all 0.15s" }}
                          >
                            {visible ? <Eye size={10} strokeWidth={1.5} /> : <EyeOff size={10} strokeWidth={1.5} />}
                            {f.label} ({f.count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 카테고리별 상세 아코디언 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {CATEGORY_META.map((c) => {
                    const cat = result.categories[c.key];
                    const Icon = c.icon;
                    const expanded = expandedCats.has(c.key);
                    return (
                      <div key={c.key} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                        <button
                          onClick={() => toggleCat(c.key)}
                          style={{ width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, transition: "background 0.15s" }}
                        >
                          <div style={{ width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${c.color}14` }}>
                            <Icon size={15} strokeWidth={1.5} style={{ color: c.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1d1d1f" }}>{c.label}</span>
                              <span style={{ fontSize: "10px", color: "#aeaeb2" }}>{c.weight}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ flex: 1, height: "4px", borderRadius: "9999px", background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: "9999px", transition: "width 0.6s ease", width: `${cat.score}%`, background: getScoreColor(cat.score) }} />
                              </div>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: getScoreColor(cat.score), minWidth: "24px", textAlign: "right" as const }}>{cat.score}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "3px 8px", borderRadius: "8px", background: `${c.color}14`, color: c.color, flexShrink: 0 }}>
                            {cat.grade}
                          </span>
                          {expanded
                            ? <ChevronDown size={13} strokeWidth={1.5} style={{ color: "#aeaeb2", flexShrink: 0 }} />
                            : <ChevronRight size={13} strokeWidth={1.5} style={{ color: "#aeaeb2", flexShrink: 0 }} />
                          }
                        </button>

                        {expanded && result.facilities && (
                          <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", fontSize: "11px", color: "#6e6e73" }}>
                              <span>시설 <strong style={{ color: "#1d1d1f" }}>{cat.count}개</strong></span>
                              <span>최근접 <strong style={{ color: "#1d1d1f" }}>{formatDistance(cat.nearest)}</strong></span>
                            </div>
                            {Object.entries(result.facilities)
                              .filter(([, fac]) => (fac as FacilityGroup).category === c.key)
                              .map(([key, fac]) => {
                                const f = fac as FacilityGroup;
                                return (
                                  <div key={key} style={{ marginBottom: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                                      <span style={{ fontSize: "11px", fontWeight: 700, color: f.color }}>{f.label}</span>
                                      <span style={{ fontSize: "10.5px", color: "#aeaeb2" }}>({f.count})</span>
                                    </div>
                                    {f.items.length === 0 ? (
                                      <p style={{ fontSize: "10.5px", color: "#aeaeb2", paddingLeft: "13px" }}>없음</p>
                                    ) : (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        {f.items.slice(0, 5).map((item, i) => (
                                          <button
                                            key={i}
                                            onClick={() => navigateTo(item.lat, item.lng)}
                                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "6px 8px", borderRadius: "8px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, transition: "background 0.12s" }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f7"; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                                          >
                                            <Navigation size={10} strokeWidth={1.5} style={{ color: "#c7c7cc", flexShrink: 0 }} />
                                            <span style={{ fontSize: "11.5px", color: "#1d1d1f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.name}</span>
                                            <span style={{ fontSize: "10.5px", color: "#aeaeb2", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{formatDistance(item.distance)}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            {Object.entries(result.facilities).filter(([, fac]) => (fac as FacilityGroup).category === c.key).length === 0 && (
                              <p style={{ fontSize: "11px", color: "#aeaeb2", padding: "4px 0" }}>반경 1km 내 시설 없음</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* 빈 상태 */}
            {!result && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", textAlign: "center" as const }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                  <MapPin size={22} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                </div>
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#1d1d1f", marginBottom: "6px" }}>주소를 입력해 주세요</p>
                <p style={{ fontSize: "12px", color: "#aeaeb2", lineHeight: 1.65 }}>교통·교육·의료·편의·생활 환경을<br />AI가 종합 점수로 분석합니다</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 카카오맵 ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

          {/* 지도 위 범례 */}
          {result && result.facilities && (
            <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.08)", padding: "12px 14px", maxHeight: "280px", overflowY: "auto" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "10px" }}>범례</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(result.facilities).map(([key, fac]) => {
                  const f = fac as FacilityGroup;
                  const visible = visibleFacilities.has(key);
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px", opacity: visible ? 1 : 0.3 }}>
                      <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "#3d3d3f" }}>{f.label}</span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "6px", borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: "2px" }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", border: "2px solid #0071e3", background: "rgba(0,113,227,0.12)", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", color: "#3d3d3f" }}>반경 1km</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
