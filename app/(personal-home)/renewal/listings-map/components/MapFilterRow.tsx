"use client";

import Link from "next/link";
import s from "../listings-map.module.css";
import { FILTER_OPTIONS, type FilterKey } from "../constants";

const FILTER_KEYS: FilterKey[] = ["type", "trade", "size"];

interface Props {
  filterRowRef: React.RefObject<HTMLDivElement | null>;
  openDropdown: FilterKey | null;
  filterLabels: Record<FilterKey, string>;
  filterActive: Record<FilterKey, boolean>;
  selectedOpts: Record<FilterKey, string>;
  toggleDropdown: (key: FilterKey) => void;
  selectOption: (key: FilterKey, value: string) => void;
  sido: string;
  sigungu: string;
  sigunguList: string[];
  updateSigungu: (value: string) => void;
  setSigungu: (value: string) => void;
}

export default function MapFilterRow({
  filterRowRef, openDropdown, filterLabels, filterActive, selectedOpts,
  toggleDropdown, selectOption, sido, sigungu, sigunguList, updateSigungu, setSigungu,
}: Props) {
  return (
    <div className={s.mapFilterRow} ref={filterRowRef}>
      {/* 건물유형 / 거래유형 / 평형 드롭다운 */}
      {FILTER_KEYS.map((key) => (
        <div className={s.filterDdWrap} key={key}>
          <button
            className={`${s.mapFilterBtn} ${filterActive[key] ? s.active : ""}`}
            onClick={() => toggleDropdown(key)}
          >
            <span>{filterLabels[key]}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="2,4 6,8 10,4" />
            </svg>
          </button>
          <div className={`${s.filterDdPanel} ${openDropdown === key ? s.open : ""}`}>
            {FILTER_OPTIONS[key].map((opt) => (
              <button
                key={opt}
                className={`${s.filterDdOpt} ${selectedOpts[key] === opt ? s.selected : ""}`}
                onClick={() => selectOption(key, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ width: "1px", height: "20px", background: "#e8eaf0", margin: "0 4px" }}></div>

      {/* 시/도 · 시/군/구 */}
      <select className={s.mapLocationSelect} value={sido} onChange={(e) => updateSigungu(e.target.value)}>
        <option value="">시 / 도</option>
        <option>서울특별시</option>
        <option>부산광역시</option>
        <option>대구광역시</option>
        <option>인천광역시</option>
        <option>광주광역시</option>
        <option>대전광역시</option>
        <option>경기도</option>
        <option>강원도</option>
      </select>
      <select className={s.mapLocationSelect} value={sigungu} onChange={(e) => setSigungu(e.target.value)}>
        <option value="">시 / 군 / 구</option>
        {sigunguList.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>

      <span className={s.filterSpacer}></span>
      <div className={s.viewToggle}>
        <Link href="/renewal/listings-list" className={s.viewBtn} title="목록보기">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
            <line x1="1" y1="3" x2="14" y2="3" />
            <line x1="1" y1="7.5" x2="14" y2="7.5" />
            <line x1="1" y1="12" x2="14" y2="12" />
          </svg>
        </Link>
        <button className={`${s.viewBtn} ${s.active}`} title="지도보기">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M7.5 1C5.3 1 3.5 2.8 3.5 5c0 3.2 4 9 4 9s4-5.8 4-9c0-2.2-1.8-4-4-4Z" />
            <circle cx="7.5" cy="5" r="1.4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
