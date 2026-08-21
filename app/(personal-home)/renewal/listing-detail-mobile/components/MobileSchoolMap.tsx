"use client";

/**
 * 모바일 전용 학군 지도 탭.
 * PC 공용 SchoolMap을 복제한 뒤, 좌측 학교 목록을 지도 위로 좌측에서 슬라이드되어
 * 나오는 반투명 유리 패널로 재구성한다. 공용 컴포넌트/CSS 무변경 (PC 무영향).
 */

import { useRef, useReducer, useCallback, useMemo, useState } from "react";
import { GraduationCap, ChevronLeft, List } from "lucide-react";
import { useKakaoMap } from "@/app/(app)/listings/[id]/components/useKakaoMap";
import { panToVisibleCenter } from "./mapPan";
import ms from "./mobile-infra.module.css";

/** 목록 패널 폭(178px)의 절반 — 열려 있을 때 가시영역 중앙 보정값 */
const PANEL_OFFSET = 89;

const SCHOOL_TYPES = [
  { key: "초등학교", color: "#2563EB" },
  { key: "중학교",   color: "#059669" },
  { key: "고등학교", color: "#DC2626" },
] as const;
type SchoolKey = typeof SCHOOL_TYPES[number]["key"] | "ALL";
interface SchoolItem { name: string; type: typeof SCHOOL_TYPES[number]["key"]; distance: string; lat: number; lng: number; color: string; }
function schType(cat: string): typeof SCHOOL_TYPES[number]["key"] | null {
  if (cat.includes("초등학교")) return "초등학교";
  if (cat.includes("중학교"))   return "중학교";
  if (cat.includes("고등학교")) return "고등학교";
  return null;
}

export default function MobileSchoolMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotsRef = useRef<Map<string, { ov: any; shape: HTMLDivElement }[]>>(new Map());
  const selectedSchoolShape = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<SchoolKey>("ALL");
  const [listOpen, setListOpen] = useState(true);
  const [{ allItems, loaded }, dispatch] = useReducer(
    (_: { allItems: SchoolItem[]; loaded: boolean }, a: { type: "done"; items: SchoolItem[] }) => ({ allItems: a.items, loaded: true }),
    { allItems: [], loaded: false },
  );
  const listItems = useMemo(() => selected === "ALL" ? allItems : allItems.filter((s) => s.type === selected), [allItems, selected]);

  const clearSelectedSchoolShape = useCallback(() => {
    if (selectedSchoolShape.current) {
      selectedSchoolShape.current.style.background = "#c7c7cc";
      selectedSchoolShape.current.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)";
      selectedSchoolShape.current = null;
    }
  }, []);

  const applyFilter = useCallback((key: SchoolKey) => {
    const map = mapRef.current; if (!map) return;
    clearSelectedSchoolShape();
    dotsRef.current.forEach((entries, type) => {
      const vis = key === "ALL" || key === type;
      entries.forEach(({ ov, shape }) => {
        ov.setMap(vis ? map : null);
        if (vis) { shape.style.background = "#c7c7cc"; shape.style.boxShadow = "0 2px 8px rgba(0,0,0,.2)"; }
      });
    });
  }, [clearSelectedSchoolShape]);

  function handleSchoolItemClick(item: SchoolItem) {
    panToVisibleCenter(mapRef.current, window.kakao, item.lat, item.lng, listOpen ? PANEL_OFFSET : 0);
    clearSelectedSchoolShape();
    const entries = dotsRef.current.get(item.type) ?? [];
    const conf = SCHOOL_TYPES.find((t) => t.key === item.type);
    if (entries[0] && conf) {
      entries[0].shape.style.background = conf.color;
      entries[0].shape.style.boxShadow = `0 2px 8px ${conf.color}88`;
      selectedSchoolShape.current = entries[0].shape;
    }
  }

  function handleSelect(key: SchoolKey) { setSelected(key); applyFilter(key); }

  useKakaoMap(containerRef, (kakao, el) => {
      const dots = dotsRef.current;
      const pos = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(el, { center: pos, level: 5 });
      mapRef.current = map;
      // 건물 핀
      const sBuildPin = document.createElement("div");
      const sBShape = document.createElement("div");
      Object.assign(sBShape.style, { width: "22px", height: "22px", borderRadius: "50% 50% 50% 0", background: "#0F2547", transform: "rotate(-45deg)", boxShadow: "0 3px 10px rgba(15,37,71,.55)", border: "2.5px solid #fff", position: "relative" });
      const sBDot = document.createElement("div");
      Object.assign(sBDot.style, { width: "7px", height: "7px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      sBShape.appendChild(sBDot); sBuildPin.appendChild(sBShape);
      new kakao.maps.CustomOverlay({ map, position: pos, content: sBuildPin, yAnchor: 1.15, zIndex: 20 });
      SCHOOL_TYPES.forEach((t) => dots.set(t.key, []));
      const ps = new kakao.maps.services.Places();
      const found: Record<string, SchoolItem> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ps.categorySearch("SC4", (data: any[], status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          for (const p of data) {
            const type = schType(p.category_name ?? ""); if (!type || found[type]) continue;
            const conf = SCHOOL_TYPES.find((t) => t.key === type)!;
            const dist = parseInt(p.distance, 10);
            const school: SchoolItem = { name: p.place_name, type, color: conf.color, distance: dist <= 800 ? `도보 ${Math.max(1, Math.round(dist / 67))}분` : `버스 ${Math.max(1, Math.round(dist / 250))}분`, lat: parseFloat(p.y), lng: parseFloat(p.x) };
            found[type] = school;
            const sMarker = document.createElement("div");
            Object.assign(sMarker.style, { display: "flex", flexDirection: "column", alignItems: "center", cursor: "default" });
            const sMShape = document.createElement("div");
            Object.assign(sMShape.style, { width: "18px", height: "18px", borderRadius: "50% 50% 50% 0", background: "#c7c7cc", transform: "rotate(-45deg)", boxShadow: "0 2px 8px rgba(0,0,0,.2)", border: "2px solid #fff", position: "relative" });
            const sMDot = document.createElement("div");
            Object.assign(sMDot.style, { width: "5px", height: "5px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
            sMShape.appendChild(sMDot); sMarker.appendChild(sMShape);
            const ov = new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(school.lat, school.lng), content: sMarker, yAnchor: 1.15, zIndex: 5 });
            dots.get(type)!.push({ ov, shape: sMShape });
            if (Object.keys(found).length === 3) break;
          }
        }
        dispatch({ type: "done", items: Object.values(found).sort((a, b) => SCHOOL_TYPES.findIndex((t) => t.key === a.type) - SCHOOL_TYPES.findIndex((t) => t.key === b.type)) });
      }, { location: pos, radius: 3000, size: 15, sort: kakao.maps.services.SortBy.DISTANCE });
      return {
        map,
        cleanup: () => {
          dots.forEach((entries) => entries.forEach(({ ov }) => ov.setMap(null)));
          dots.clear(); mapRef.current = null;
        },
      };
  }, [lat, lng]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["ALL", ...SCHOOL_TYPES.map((t) => t.key)] as SchoolKey[]).map((key) => {
          const conf = SCHOOL_TYPES.find((t) => t.key === key);
          const active = selected === key;
          return (
            <button key={key} onClick={() => handleSelect(key)}
              style={{ borderRadius: 100, border: "1px solid", padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                background: active ? (conf?.color ?? "#0F2547") : "#fff", borderColor: active ? (conf?.color ?? "#0F2547") : "#dde3ef", color: active ? "#fff" : "#6e6e73",
              }}>{key === "ALL" ? "전체" : key}
            </button>
          );
        })}
      </div>

      {/* 지도 전체 폭 + 좌측 슬라이드 반투명 목록 오버레이 */}
      <div className={ms.mapArea}>
        <div className={ms.mapFull}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>

        <div className={`${ms.slidePanel} ${listOpen ? "" : ms.closed}`}>
          <div className={ms.slideHeader}>
            <p className={ms.slideTitle}>{selected === "ALL" ? "전체 학교" : `${selected} (${listItems.length})`}</p>
            <button className={ms.slideToggle} onClick={() => setListOpen(false)} aria-label="목록 접기">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          </div>
          <div className={ms.slideBody}>
            {!loaded
              ? <div className={ms.emptyMsg}><p style={{ fontSize: 12, color: "#6b7280" }}>로딩 중...</p></div>
              : listItems.length === 0
              ? <div className={ms.emptyMsg}><p style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>반경 3km 내<br/>학교 없음</p></div>
              : listItems.map((item, i) => (
                <div key={i} className={ms.listItem} onClick={() => handleSchoolItemClick(item)}>
                  <GraduationCap size={10} strokeWidth={2} style={{ color: item.color, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <p className={ms.listName}>{item.name}</p>
                    <p className={ms.listDist}>{item.distance}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {!listOpen && (
          <button className={ms.openBtn} onClick={() => setListOpen(true)}>
            <List size={14} strokeWidth={2} /> 목록
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>학군 정보는 참고용이며, 실제 배정과 다를 수 있습니다.</p>
    </div>
  );
}
