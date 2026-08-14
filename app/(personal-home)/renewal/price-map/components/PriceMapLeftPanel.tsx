"use client";

import s from "../price-map-renewal.module.css";
import { formatMapPrice } from "@/app/(map)/price-map/lib/formatMapPrice";
import { getSelectableSidoMap } from "@/app/(map)/price-map/constants";
import type { AptData, PriceMapTradeType, PropertyType } from "@/app/(map)/price-map/types";

interface Props {
  selectedGu: string;
  setSelectedGu: (gu: string) => void;
  selectedSido: string;
  setSelectedSido: (s: string) => void;
  tradeType: PriceMapTradeType;
  setTradeType: (t: PriceMapTradeType) => void;
  propertyType: PropertyType;
  setPropertyType: (t: PropertyType) => void;
  topChanges: AptData[];
  loading: boolean;
  selectedApt: AptData | null;
  onSelectApt: (apt: AptData) => void;
}

const PROPERTY_TYPES: PropertyType[] = ["아파트", "연립/빌라/다세대"];

/** 시세지도 좌측 패널 — 지역/거래유형/매물유형 필터 + 변동 TOP 리스트 (실데이터) */
export default function PriceMapLeftPanel({
  selectedGu, setSelectedGu, selectedSido, setSelectedSido,
  tradeType, setTradeType, propertyType, setPropertyType,
  topChanges, loading, selectedApt, onSelectApt,
}: Props) {
  const sidoMap = getSelectableSidoMap(propertyType);
  const sidoList = Object.keys(sidoMap);
  const guList = sidoMap[selectedSido] || [];

  // 상승/하락 분리
  const ups = topChanges.filter((a) => (a.change ?? 0) >= 0);
  const downs = topChanges.filter((a) => (a.change ?? 0) < 0);

  return (
    <div className={s.leftPanel}>
      <div className={s.lpHeader}>
        <div className={s.lpTitle}>시세지도</div>
        <div className={s.tradeToggle}>
          <button
            className={`${s.ttBtn} ${tradeType === "매매" ? s.on : ""}`}
            onClick={() => setTradeType("매매")}
          >매매</button>
          <button
            className={`${s.ttBtn} ${tradeType === "전세" ? s.on : ""}`}
            onClick={() => setTradeType("전세")}
          >전세</button>
        </div>
        <div className={s.regionRow}>
          <select
            className={s.lpSelect}
            value={selectedSido}
            onChange={(e) => setSelectedSido(e.target.value)}
          >
            {sidoList.map((sido) => (
              <option key={sido} value={sido}>{sido}</option>
            ))}
          </select>
          <select
            className={s.lpSelect}
            value={selectedGu}
            onChange={(e) => setSelectedGu(e.target.value)}
          >
            {guList.map((gu) => (
              <option key={gu} value={gu}>{gu}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={s.lpFilters}>
        {PROPERTY_TYPES.map((t) => (
          <button
            key={t}
            className={`${s.lpChip} ${propertyType === t ? s.on : ""}`}
            onClick={() => setPropertyType(t)}
          >
            {t === "연립/빌라/다세대" ? "빌라" : t}
          </button>
        ))}
      </div>
      <div className={s.lpListHead}>
        <span className={s.lpListTitle}>{selectedGu} 변동 TOP</span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,.3)" }}>변동률 순</span>
      </div>
      <div className={s.lpList}>
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className={s.lpItem} style={{ opacity: 0.4 }}>
              <span className={s.lpRank}>-</span>
              <div className={s.lpItemInfo}>
                <div className={s.lpAptName}>불러오는 중…</div>
                <div className={s.lpAptSub}> </div>
              </div>
            </div>
          ))
        ) : topChanges.length === 0 ? (
          <div className={s.lpItem} style={{ cursor: "default" }}>
            <div className={s.lpItemInfo}>
              <div className={s.lpAptName}>실거래 데이터가 없습니다</div>
              <div className={s.lpAptSub}>다른 지역/조건을 선택하세요</div>
            </div>
          </div>
        ) : (
          <>
            {ups.map((apt, i) => (
              <AptRow key={`${apt.name}-${apt.area}-up`} apt={apt} rank={i + 1} tradeType={tradeType} active={isSame(selectedApt, apt)} onClick={() => onSelectApt(apt)} />
            ))}
            {downs.length > 0 && (
              <>
                <div className={s.lpDivider} />
                <div className={s.lpSectionLabel}>하락 TOP</div>
                {downs.map((apt, i) => (
                  <AptRow key={`${apt.name}-${apt.area}-dn`} apt={apt} rank={i + 1} tradeType={tradeType} active={isSame(selectedApt, apt)} onClick={() => onSelectApt(apt)} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function isSame(a: AptData | null, b: AptData): boolean {
  return !!a && a.name === b.name && a.area === b.area && a.lat === b.lat && a.lng === b.lng;
}

function AptRow({ apt, rank, tradeType, active, onClick }: {
  apt: AptData; rank: number; tradeType: PriceMapTradeType; active: boolean; onClick: () => void;
}) {
  const isUp = (apt.change ?? 0) >= 0;
  return (
    <div className={`${s.lpItem} ${active ? s.on : ""}`} onClick={onClick}>
      <span className={s.lpRank}>{rank}</span>
      <div className={s.lpItemInfo}>
        <div className={s.lpAptName}>{apt.name}</div>
        <div className={s.lpAptSub}>{apt.dong} · {apt.area ? `${apt.area}평` : "-"}</div>
      </div>
      <div>
        <div className={s.lpAptPrice}>{formatMapPrice(apt, tradeType)}</div>
        <div className={`${s.lpChg} ${isUp ? s.lpChgUp : s.lpChgDn}`}>
          {apt.change !== null ? `${isUp ? "▲ +" : "▼ "}${apt.change}%` : "-"}
        </div>
      </div>
    </div>
  );
}
