"use client";

import { useRef, useState } from "react";
import KakaoScript from "@/components/common/KakaoScript";
import {
  useNeighborhoodData,
  type FacilityGroup,
} from "@/app/(map)/neighborhood/hooks/useNeighborhoodData";
import s from "../jeonse-renewal.module.css";

// 카테고리 표시 메타 (시안 catMeta)
const CAT_META = [
  { key: "transport", label: "교통", icon: "🚇", color: "#0071e3", weight: "25%" },
  { key: "education", label: "교육", icon: "🎓", color: "#6e3de8", weight: "20%" },
  { key: "medical", label: "의료", icon: "🏥", color: "#ff3b30", weight: "20%" },
  { key: "convenience", label: "편의", icon: "🛒", color: "#1a9e45", weight: "15%" },
  { key: "living", label: "생활", icon: "🌿", color: "#b86f00", weight: "20%" },
] as const;

type CatKey = (typeof CAT_META)[number]["key"];

function scColor(v: number) {
  return v >= 80 ? "#1a9e45" : v >= 60 ? "#0071e3" : v >= 40 ? "#b86f00" : "#ff3b30";
}
function scBg(v: number) {
  return v >= 80
    ? "rgba(48,209,88,.10)"
    : v >= 60
    ? "rgba(0,113,227,.10)"
    : v >= 40
    ? "rgba(255,159,10,.10)"
    : "rgba(255,59,48,.10)";
}
function fmtDist(m: number) {
  return m === 0 ? "-" : m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

interface AddrSuggestion {
  label: string;
  sub: string;
}

export function JeonseEnvAnalysis() {
  const {
    mapRef,
    address,
    setAddress,
    loading,
    result,
    error,
    expandedCats,
    visibleFacilities,
    toggleCat,
    handleAnalyze,
    toggleFacility,
    toggleAllFacilities,
  } = useNeighborhoodData();

  // ── 주소 자동완성 (서버 프록시 /api/address-search) ──
  const [drop, setDrop] = useState<AddrSuggestion[]>([]);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropIdx, setDropIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onInput = (val: string) => {
    setAddress(val);
    setDropIdx(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = val.trim();
    if (q.length < 2) {
      setDropOpen(false);
      setDrop([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: AddrSuggestion[] = (json.results || []).map((r: any) => ({
          label: r.roadAddress || r.address,
          sub: r.buildingName || r.address || "",
        }));
        setDrop(items);
        setDropOpen(true);
      } catch {
        setDrop([]);
        setDropOpen(true);
      }
    }, 250);
  };

  const selectSuggestion = (i: number) => {
    const a = drop[i];
    if (!a) return;
    setAddress(a.label);
    setDropOpen(false);
    handleAnalyze(a.label);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropOpen || drop.length === 0) {
      if (e.key === "Enter") {
        setDropOpen(false);
        handleAnalyze();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropIdx((i) => Math.min(i + 1, drop.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (dropIdx >= 0) {
        e.preventDefault();
        selectSuggestion(dropIdx);
      } else {
        setDropOpen(false);
        handleAnalyze();
      }
    } else if (e.key === "Escape") {
      setDropOpen(false);
    }
  };

  const runAnalyze = () => {
    setDropOpen(false);
    handleAnalyze();
  };

  // 카테고리별 시설 그룹 (실제 API category 필드 기준)
  const facByCat = (catKey: CatKey): [string, FacilityGroup][] =>
    result
      ? (Object.entries(result.facilities).filter(
          ([, f]) => (f as FacilityGroup).category === catKey,
        ) as [string, FacilityGroup][])
      : [];

  const showEmpty = !loading && !result && !error;

  return (
    <div className={s.envLayout}>
      <KakaoScript />

      {/* ─ 좌측 패널 ─ */}
      <div className={s.envPanel}>
        {/* 다크 헤더 */}
        <div className={s.envPanelHead}>
          <div className={s.envHeadIn}>
            <div className={s.envChipHd}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              주변환경분석
            </div>
            <h2 className={s.envHeadTitle}>주변 환경 분석</h2>
            <p className={s.envHeadSub}>교통 · 교육 · 의료 · 편의 · 생활 환경을<br />AI가 종합 점수로 분석합니다</p>
            <div className={s.envHdChips}>
              <span className={s.envHdChip} style={{ color: "#4da6ff" }}>🚇 교통</span>
              <span className={s.envHdChip} style={{ color: "#b388ff" }}>🎓 교육</span>
              <span className={s.envHdChip} style={{ color: "#ff8080" }}>🏥 의료</span>
              <span className={s.envHdChip} style={{ color: "#69e08a" }}>🛒 편의</span>
              <span className={s.envHdChip} style={{ color: "#ffcc66" }}>🌿 생활</span>
            </div>
          </div>
        </div>

        {/* 검색 */}
        <div className={s.envPanelSearch}>
          <div className={s.envSearchRow}>
            <input
              className={s.envSi}
              type="text"
              placeholder="도로명·지번·건물명 입력"
              autoComplete="off"
              value={address}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => setTimeout(() => setDropOpen(false), 150)}
            />
            <button className={s.envAb} onClick={runAnalyze} disabled={loading}>
              분석
            </button>
            <div className={`${s.envDrop}${dropOpen ? " " + s.show : ""}`}>
              {drop.length === 0 ? (
                <div className={s.envDropEmpty}>검색 결과가 없습니다</div>
              ) : (
                drop.map((a, i) => (
                  <div
                    key={i}
                    className={`${s.envDropItem}${i === dropIdx ? " " + s.on : ""}`}
                    onMouseDown={() => selectSuggestion(i)}
                  >
                    {a.label}
                    {a.sub && <small>{a.sub}</small>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 바디 */}
        <div className={s.envPanelBody}>
          {/* 빈 상태 */}
          {showEmpty && (
            <div className={s.envEmpty}>
              <div className={s.envEi}>
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <p className={s.envEt}>주소를 입력해 주세요</p>
              <p className={s.envEd}>교통·교육·의료·편의·생활 환경을<br />AI가 종합 점수로 분석합니다</p>
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className={`${s.envLoadingBox} ${s.show}`}>
              <div className={s.envSpinner}></div>
              <p className={s.envLt}>주변 환경 분석 중...</p>
            </div>
          )}

          {/* 에러 */}
          {error && !loading && (
            <div className={s.envEmpty}>
              <p className={s.envEt}>{error}</p>
              <p className={s.envEd}>주소를 다시 확인해 주세요</p>
            </div>
          )}

          {/* 결과 */}
          {result && !loading && (
            <div>
              {/* 종합 점수 */}
              <div className={s.envScoreCard}>
                <div className={s.envScoreTop}>
                  <div
                    className={s.envDonut}
                    style={{ background: `conic-gradient(${scColor(result.totalScore)} ${result.totalScore * 3.6}deg,#e5e7eb 0deg)` }}
                  >
                    <div className={s.envDonutIn} style={{ color: scColor(result.totalScore) }}>
                      {result.totalScore}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.envGradeRow}>
                      <span className={s.envGradeTxt}>{result.totalGrade} 등급</span>
                      <span
                        className={s.envGradeChip}
                        style={{ color: scColor(result.totalScore), background: scBg(result.totalScore) }}
                      >
                        {result.totalScore}점
                      </span>
                    </div>
                    <div className={s.envAddrTxt}>{result.address}</div>
                  </div>
                </div>
                <div className={s.envCatRow}>
                  {CAT_META.map((c) => {
                    const cat = result.categories[c.key];
                    return (
                      <span key={c.key} className={s.envCatBadge} style={{ background: `${c.color}22`, color: c.color }}>
                        {c.icon} {c.label} {cat.score}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* K-apt 단지정보 */}
              {result.kaptInfo && (
                <div className={`${s.envKapt} ${s.show}`}>
                  <div className={s.envKaptHd}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    단지정보
                  </div>
                  <div className={s.envKaptVals}>
                    시공사 {result.kaptInfo.constructorName} · {result.kaptInfo.corridorType} · {result.kaptInfo.households.toLocaleString()}세대 · CCTV {result.kaptInfo.cctvCount}대 · 주차 {result.kaptInfo.parkingTotal.toLocaleString()}면 · 승강기 {result.kaptInfo.elevatorCount}대
                  </div>
                </div>
              )}

              {/* AI 코멘트 */}
              <div className={s.envAi}>
                <span className={s.envAiIco}>✦</span>
                <p className={s.envAiTxt}>{result.aiComment}</p>
              </div>

              {/* 시설 표시 토글 */}
              <div className={s.envFacBox}>
                <div className={s.envFacHd}>
                  <span className={s.envFacHdT}>시설 표시</span>
                  <div className={s.envFacActs}>
                    <button className={s.envFacAct} onClick={() => toggleAllFacilities(true)}>전체 보기</button>
                    <span className={s.envFacSep}>|</span>
                    <button className={`${s.envFacAct} ${s.dim}`} onClick={() => toggleAllFacilities(false)}>전체 숨기기</button>
                  </div>
                </div>
                <div className={s.envFacTags}>
                  {Object.entries(result.facilities).map(([key, fac]) => {
                    const f = fac as FacilityGroup;
                    const visible = visibleFacilities.has(key);
                    return (
                      <button
                        key={key}
                        className={`${s.envFtag}${visible ? "" : " " + s.off}`}
                        style={{ border: `1px solid ${f.color}`, color: f.color, background: `${f.color}22` }}
                        onClick={() => toggleFacility(key)}
                      >
                        <span style={{ marginRight: 2 }}>{visible ? "👁" : "🚫"}</span> {f.label} ({f.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 카테고리 아코디언 */}
              <div className={s.envAccs}>
                {CAT_META.map((c) => {
                  const cat = result.categories[c.key];
                  const col = scColor(cat.score);
                  const open = expandedCats.has(c.key);
                  return (
                    <div key={c.key} className={s.envAcc}>
                      <button className={s.envAccBtn} onClick={() => toggleCat(c.key)}>
                        <div className={s.envAccIco} style={{ background: `${c.color}22` }}>{c.icon}</div>
                        <div className={s.envAccLw}>
                          <div className={s.envAccLt}>{c.label}<span className={s.envAccWt}>{c.weight}</span></div>
                          <div className={s.envAccBr}>
                            <div className={s.envAccTrack}><div className={s.envAccFill} style={{ width: `${cat.score}%`, background: col }}></div></div>
                            <span className={s.envAccSc} style={{ color: col }}>{cat.score}</span>
                          </div>
                        </div>
                        <span className={s.envAccGr} style={{ background: `${c.color}22`, color: c.color }}>{cat.grade}</span>
                        <span className={`${s.envAccArrow}${open ? " " + s.open : ""}`}>▶</span>
                      </button>
                      <div className={`${s.envAccBody}${open ? " " + s.open : ""}`}>
                        <div className={s.envAccMeta}>
                          <span>시설 <strong>{cat.count}개</strong></span>
                          <span>최근접 <strong>{fmtDist(cat.nearest)}</strong></span>
                        </div>
                        {facByCat(c.key).map(([fk, f]) => (
                          <div key={fk} className={s.envFg}>
                            <div className={s.envFgHd}>
                              <div className={s.envFgDot} style={{ background: f.color }}></div>
                              <span className={s.envFgName} style={{ color: f.color }}>{f.label}</span>
                              <span className={s.envFgCnt}>({f.count})</span>
                            </div>
                            {f.items.length === 0 ? (
                              <p style={{ fontSize: "10.5px", color: "#aeaeb2", paddingLeft: "13px" }}>없음</p>
                            ) : (
                              <div>
                                {f.items.slice(0, 5).map((it, ii) => (
                                  <div key={ii} className={s.envFi}>
                                    <span className={s.envFiN}>{it.name}</span>
                                    <span className={s.envFiD}>{fmtDist(it.distance)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─ 우측 지도 ─ */}
      <div className={s.envMapArea}>
        <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
      </div>
    </div>
  );
}
