"use client";

import { CreditCard } from "lucide-react";
import { PRICING } from "../constants";

export function PricingSection() {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <CreditCard size={18} strokeWidth={1.5} style={{ color: "#0071e3" }} />
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>상담 요금 안내</h2>
      </div>
      <p style={{ fontSize: "12px", color: "#6e6e73", margin: "0 0 20px" }}>분야별 전문가 상담 요금을 확인하세요 (VAT 포함)</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }} className="pricing-grid">
        {PRICING.map((item) => (
          <div
            key={item.label}
            style={{
              position: "relative", borderRadius: "14px", padding: "20px 16px", textAlign: "center",
              background: item.highlight ? "linear-gradient(148deg, #0c1527, #141820)" : "#f5f5f7",
              border: item.highlight ? "1px solid rgba(0,113,227,0.25)" : "1px solid rgba(0,0,0,0.07)",
              boxShadow: item.highlight ? "0 4px 20px rgba(0,113,227,0.15)" : "none",
            }}
          >
            {item.highlight && (
              <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", padding: "2px 10px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, background: "#0071e3", color: "#fff", letterSpacing: "0.08em" }}>BEST</span>
            )}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                <item.icon size={24} strokeWidth={1.5} style={{ color: item.highlight ? "#2997ff" : "#0071e3" }} />
              </div>
            <h3 style={{ fontSize: "12px", fontWeight: 600, color: item.highlight ? "rgba(255,255,255,0.70)" : "#3d3d3f", margin: "0 0 6px" }}>{item.label}</h3>
            <p style={{ fontSize: "18px", fontWeight: 700, color: item.highlight ? "#fff" : "#1d1d1f", margin: 0 }}>
              {item.price}
              <span style={{ fontSize: "10px", fontWeight: 400, color: item.highlight ? "rgba(255,255,255,0.50)" : "#aeaeb2", marginLeft: "2px" }}>원/건</span>
            </p>
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 640px) { .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  );
}
