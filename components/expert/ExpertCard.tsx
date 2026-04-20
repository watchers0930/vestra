"use client";

import { Star, Briefcase, BadgeCheck } from "lucide-react";

export interface Expert {
  id: string;
  name: string;
  category: string;
  specialties: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  consultFee: number;
  available: boolean;
}

interface ExpertCardProps {
  expert: Expert;
  onConsult?: (expert: Expert) => void;
  className?: string;
}

function formatFee(fee: number) {
  if (fee >= 10000) return `${(fee / 10000).toLocaleString()}만원`;
  return `${fee.toLocaleString()}원`;
}

export function ExpertCard({ expert, onConsult }: ExpertCardProps) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "20px", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.10)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(148deg, #0c1527, #141820)", border: "1px solid rgba(0,113,227,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#2997ff" }}>{expert.name.charAt(0)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1d1d1f" }}>{expert.name}</span>
            <BadgeCheck size={14} style={{ color: "#0071e3", flexShrink: 0 }} />
          </div>
          <p style={{ fontSize: "11px", color: "#6e6e73", margin: "2px 0 0" }}>{expert.category}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
          <Star size={12} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#1d1d1f" }}>{expert.rating.toFixed(1)}</span>
          <span style={{ fontSize: "10px", color: "#aeaeb2" }}>({expert.reviewCount})</span>
        </div>
      </div>

      {/* 전문 분야 태그 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "14px" }}>
        {expert.specialties.map((s) => (
          <span key={s} style={{ padding: "3px 8px", borderRadius: "20px", background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.07)", fontSize: "10px", color: "#3d3d3f" }}>{s}</span>
        ))}
      </div>

      {/* 통계 */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", color: "#6e6e73", marginBottom: "14px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Briefcase size={11} /> 경력 {expert.experience}년
        </span>
        <span style={{ color: "#1d1d1f", fontWeight: 600 }}>상담료 {formatFee(expert.consultFee)}</span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onConsult?.(expert)}
        disabled={!expert.available}
        style={{
          marginTop: "auto", width: "100%", padding: "10px", borderRadius: "12px", border: "none",
          background: expert.available ? "linear-gradient(148deg, #0071e3, #0058b0)" : "#f5f5f7",
          color: expert.available ? "#fff" : "#aeaeb2",
          fontSize: "13px", fontWeight: 600, cursor: expert.available ? "pointer" : "not-allowed",
          boxShadow: expert.available ? "0 4px 12px rgba(0,113,227,0.25)" : "none",
        }}
      >
        {expert.available ? "상담 요청" : "상담 불가"}
      </button>
    </div>
  );
}
