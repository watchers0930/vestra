"use client";

import { useState } from "react";
import { EmergencyResponseModal } from "@/components/common/EmergencyResponseModal";

// 임시 테스트 페이지 — 배포 확인 후 삭제 예정
const MOCK_ALERTS = [
  {
    id: "alert-001",
    changeType: "mortgage_added",
    summary: "전세 계약 기간 중 근저당권이 새로 설정되었습니다. 채권최고액 1억 5천만원 (채권자: 신한은행). 즉시 대응이 필요합니다.",
    riskLevel: "critical",
    createdAt: new Date().toISOString(),
    propertyAddress: "서울시 강남구 역삼동 123-45, 101호",
    label: "근저당 설정 (critical)",
  },
  {
    id: "alert-002",
    changeType: "seizure_added",
    summary: "해당 부동산에 압류가 설정되었습니다. 국세청 체납으로 인한 강제집행 가능성이 있습니다.",
    riskLevel: "high",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    propertyAddress: "서울시 마포구 합정동 456-78, 202호",
    label: "압류 설정 (high)",
  },
  {
    id: "alert-003",
    changeType: "ownership_changed",
    summary: "소유권이 제3자에게 이전되었습니다. 임대차 계약의 대항력과 우선변제권을 즉시 확인하세요.",
    riskLevel: "critical",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    propertyAddress: "경기도 성남시 분당구 정자동 789-10, 303호",
    label: "소유권 변동 (critical)",
  },
];

export default function TestEmergencyModalPage() {
  const [openAlert, setOpenAlert] = useState<(typeof MOCK_ALERTS)[0] | null>(null);

  return (
    <div style={{ padding: "40px 24px", maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#1d1d1f", marginBottom: "8px" }}>
          긴급대응 모달 테스트
        </h1>
        <p style={{ fontSize: "13px", color: "#6e6e73" }}>
          등기 위험 변동 감지 시 표시되는 팝업을 미리 확인합니다.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {MOCK_ALERTS.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => setOpenAlert(alert)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderRadius: "14px",
              border: "1.5px solid rgba(255,59,48,0.25)",
              background: "rgba(255,59,48,0.04)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: alert.riskLevel === "critical" ? "rgba(255,59,48,0.10)" : "rgba(255,149,0,0.10)",
                  color: alert.riskLevel === "critical" ? "#ff3b30" : "#ff9500",
                  fontSize: "11px",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                {alert.riskLevel === "critical" ? "⚠️ 긴급" : "⚡ 위험"}
              </span>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
                {alert.label}
              </p>
              <p style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "2px" }}>
                {alert.propertyAddress}
              </p>
            </div>
            <span style={{ fontSize: "12px", color: "#0071e3", fontWeight: 600 }}>
              긴급대응 열기 →
            </span>
          </button>
        ))}
      </div>

      {openAlert && (
        <EmergencyResponseModal
          open={true}
          onClose={() => setOpenAlert(null)}
          alertId={openAlert.id}
          changeType={openAlert.changeType}
          summary={openAlert.summary}
          riskLevel={openAlert.riskLevel}
          createdAt={openAlert.createdAt}
          propertyAddress={openAlert.propertyAddress}
        />
      )}
    </div>
  );
}
