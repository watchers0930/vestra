"use client";

import s from "../listings-map.module.css";
import { SAMPLE_PHOTOS, type Apt } from "../constants";
import { formatKoreanWon } from "../lib/format";

interface Props {
  region: string;
  loadingItems: boolean;
  items: Apt[];
  activeItem: number | null;
  openDetail: (idx: number) => void;
}

export default function MapListPanel({ region, loadingItems, items, activeItem, openDetail }: Props) {
  return (
    <div className={s.mapListPanel}>
      <div className={s.listGroupHeader}>
        <span className={s.listGroupTitle}>{region}</span>
        <span className={s.listGroupCount}>{loadingItems ? "…" : `${items.length}건`}</span>
      </div>

      {/* 앱 ListingsMapView(ListingCardSmall) 스타일 카드 */}
      {items.map((a, idx) => (
        <button
          key={`${a.aptName}-${a.dealDate}-${idx}`}
          onClick={() => openDetail(idx)}
          style={{
            width: "100%", display: "flex", gap: 12, padding: "12px 14px",
            textAlign: "left", border: "none", borderBottom: "1px solid #eef0f4",
            cursor: "pointer", background: activeItem === idx ? "#EFF5FF" : "#fff",
          }}
        >
          <div style={{
            width: 62, height: 62, borderRadius: 8, overflow: "hidden", flexShrink: 0,
            background: `#EEF1F8 url('${SAMPLE_PHOTOS[idx % SAMPLE_PHOTOS.length]}') center/cover no-repeat`,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#e04444", color: "#fff" }}>매매</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>{formatKoreanWon(a.dealAmount).replace(/원$/, "")}</p>
            <p style={{ fontSize: 12, color: "#8a8f9c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "3px 0 6px" }}>{region} {a.dong} {a.aptName}</p>
            <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "#2563eb", background: "#e0edff", padding: "2px 9px", borderRadius: 12 }}>국토부 실거래</span>
          </div>
        </button>
      ))}
      {!loadingItems && items.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#aeaeb2", fontSize: 13 }}>매물이 없습니다</div>
      )}
    </div>
  );
}
