"use client";

import { Building2 } from "lucide-react";
import type { PredictionResult } from "../types";

interface Props {
  kaptInfo: NonNullable<PredictionResult["kaptInfo"]>;
}

function InfoItem({ label, value }: { label: string; value: string | number | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontSize: "10.5px", color: "#aeaeb2" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>{value}</span>
    </div>
  );
}

function TagList({ label, raw }: { label: string; raw: string }) {
  const items = raw.split(/[,·/]/).map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <span style={{ fontSize: "10.5px", color: "#aeaeb2", display: "block", marginBottom: "6px" }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
        {items.map((t, i) => (
          <span key={i} style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.06)", color: "#3d3d3f" }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function KaptInfoCard({ kaptInfo }: Props) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px" }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: 600, color: "#6e6e73", marginBottom: "16px" }}>
        <Building2 size={14} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
        단지 정보
        {kaptInfo.kaptName && <span style={{ fontSize: "12px", fontWeight: 500, color: "#aeaeb2" }}>— {kaptInfo.kaptName}</span>}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
        <InfoItem label="시공사" value={kaptInfo.constructorName} />
        <InfoItem label="복도유형" value={kaptInfo.corridorType} />
        <InfoItem label="CCTV" value={kaptInfo.cctvCount ? `${kaptInfo.cctvCount}대` : undefined} />
        <InfoItem label="총 주차" value={kaptInfo.parkingTotal ? `${kaptInfo.parkingTotal}대` : undefined} />
        <InfoItem label="승강기" value={kaptInfo.elevatorCount ? `${kaptInfo.elevatorCount}대` : undefined} />
        <InfoItem label="전기차 충전" value={kaptInfo.evChargerCount ? `${kaptInfo.evChargerCount}대` : undefined} />
        <InfoItem label="난방방식" value={kaptInfo.heatingType} />
        <InfoItem label="전용면적별 세대" value={kaptInfo.unitsByArea} />
        {kaptInfo.convFacilities && <TagList label="편의시설" raw={kaptInfo.convFacilities} />}
        {kaptInfo.eduFacilities && <TagList label="교육시설" raw={kaptInfo.eduFacilities} />}
      </div>
    </div>
  );
}
