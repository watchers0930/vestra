"use client";

import { useEffect, useState } from "react";
import { ReceiptText, CreditCard, Loader2 } from "lucide-react";
import type { IssuedRegistryAnalysisPayload } from "../hooks/useRightsAnalysis";

const REGISTRY_ISSUE_PRICE = 1000;

const APARTMENT_KEYWORDS = ["아파트", "오피스텔", "빌라", "연립", "다세대", "주상복합", "apt"];

function detectApartment(address: string): boolean {
  const lower = address.toLowerCase();
  return APARTMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

interface Props {
  applyIssuedRegistryAnalysis: (payload: IssuedRegistryAnalysisPayload) => void;
}

export function RegistryIssueSection({ applyIssuedRegistryAnalysis }: Props) {
  const [issueAddress, setIssueAddress] = useState("");
  const [issueOwnerName, setIssueOwnerName] = useState("");
  const [issueConsent, setIssueConsent] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issuePropertyId, setIssuePropertyId] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [isApartment, setIsApartment] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");

  useEffect(() => {
    setIsApartment(detectApartment(issueAddress));
  }, [issueAddress]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("issue") !== "1") return;

    const raw = sessionStorage.getItem("vestra_registry_issue_prefill");
    if (!raw) return;

    try {
      const prefill = JSON.parse(raw) as {
        propertyId?: string;
        address?: string;
        commUniqueNo?: string;
        ownerName?: string;
      };
      if (prefill.propertyId) setIssuePropertyId(prefill.propertyId);
      if (prefill.address) setIssueAddress(prefill.address);
      if (prefill.ownerName) setIssueOwnerName(prefill.ownerName);
      setIssueMessage("감시 알림의 물건 정보가 입력되었습니다. 동의 후 최신 등기부를 확인하세요.");
    } catch {
      /* 프리필 실패 시 수동 입력 유지 */
    }
  }, []);

  const canSubmitIssue =
    issueAddress.trim().length >= 5 &&
    issueOwnerName.trim().length >= 2 &&
    issueConsent;

  async function handleIssueOrder() {
    if (issueLoading) return;
    setIssueLoading(true);
    setIssueMessage("");

    const fullAddress =
      isApartment && unitNumber.trim()
        ? `${issueAddress.trim()} ${unitNumber.trim()}`
        : issueAddress.trim();

    try {
      const res = await fetch("/api/registry/issue-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fullAddress,
          registryAddress: fullAddress,
          monitoredPropertyId: issuePropertyId || undefined,
          ownerName: issueOwnerName.trim(),
          purpose: "analysis",
          includeHistory: true,
          acceptedTerms: issueConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIssueMessage(data.detail || data.error || "등기부 발급 및 분석에 실패했습니다.");
        return;
      }
      if (data.analysis && data.registry) {
        applyIssuedRegistryAnalysis(data as IssuedRegistryAnalysisPayload);
        setIssueMessage(`등기부 발급 및 AI 권리분석이 완료되었습니다. 주문번호 ${data.order.orderId}`);
        return;
      }
      setIssueMessage(`결제 대기 주문이 생성되었습니다. 주문번호 ${data.order.orderId}`);
    } catch {
      setIssueMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIssueLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.10)",
    fontSize: "12.5px",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    marginBottom: "8px",
  };

  return (
    <div
      style={{
        marginBottom: "18px",
        border: "1px solid rgba(0,113,227,0.12)",
        borderRadius: "16px",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(0,113,227,0.06), rgba(48,209,88,0.05))",
      }}
    >
      <div style={{ padding: "16px" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", marginBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
              <ReceiptText size={16} style={{ color: "#0071e3" }} />
              <p style={{ fontSize: "13.5px", fontWeight: 800, color: "#1d1d1f" }}>등기부 조회 및 AI 권리분석 신청</p>
            </div>
            <p style={{ fontSize: "11.5px", color: "#6e6e73", lineHeight: 1.55 }}>
              공식 연계 API로 최신 등기부 정보를 조회하고, 수신 즉시 권리분석과 기준 스냅샷 저장에 사용합니다.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "10.5px", color: "#86868b" }}>조회+AI 분석 기준가</p>
            <p style={{ fontSize: "18px", fontWeight: 900, color: "#0071e3" }}>{REGISTRY_ISSUE_PRICE.toLocaleString()}원</p>
          </div>
        </div>

        {/* 주소 입력 */}
        <input
          value={issueAddress}
          onChange={(e) => setIssueAddress(e.target.value)}
          placeholder="부동산 주소를 입력하세요 (예: 서울시 강남구 역삼동 123)"
          style={inputStyle}
        />

        {/* 집합건물 여부 체크 */}
        <label style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isApartment}
            onChange={(e) => {
              setIsApartment(e.target.checked);
              if (!e.target.checked) setUnitNumber("");
            }}
          />
          <span style={{ fontSize: "11.5px", color: "#3c3c43", fontWeight: 500 }}>
            집합건물 (아파트·오피스텔·빌라 등)
          </span>
          {isApartment && detectApartment(issueAddress) && (
            <span style={{ fontSize: "10.5px", color: "#0071e3", background: "rgba(0,113,227,0.08)", borderRadius: "6px", padding: "1px 7px" }}>
              자동 감지
            </span>
          )}
        </label>

        {/* 동호수 입력 (집합건물일 때만) */}
        {isApartment && (
          <>
            <input
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="동호수 (예: 101동 502호)"
              style={inputStyle}
            />
            {!unitNumber.trim() && (
              <p style={{ fontSize: "11px", color: "#ff9500", marginBottom: "8px", marginTop: "-4px" }}>
                ⚠ 동호수 미입력 시 소유자명 기준으로 조회되어 정확도가 낮아질 수 있습니다.
              </p>
            )}
          </>
        )}

        {/* 소유자명 입력 */}
        <input
          value={issueOwnerName}
          onChange={(e) => setIssueOwnerName(e.target.value)}
          placeholder={isApartment && !unitNumber.trim() ? "등기부상 소유자명 (필수)" : "등기부상 소유자명"}
          style={{
            ...inputStyle,
            borderColor:
              isApartment && !unitNumber.trim() && !issueOwnerName.trim()
                ? "rgba(255,149,0,0.4)"
                : "rgba(0,0,0,0.10)",
          }}
        />

        {/* 동의 체크 */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={issueConsent}
            onChange={(e) => setIssueConsent(e.target.checked)}
            style={{ marginTop: "2px" }}
          />
          <span style={{ fontSize: "11px", color: "#6e6e73", lineHeight: 1.45 }}>
            베스트라의 등기부 조회 및 AI 권리분석 서비스를 위해 입력 정보를 공식 연계 조회 사업자에 전송하고, 조회된 문서를 권리분석 및 감시 기준 스냅샷에 사용하는 데 동의합니다.
          </span>
        </label>

        {/* 제출 버튼 */}
        <button
          onClick={handleIssueOrder}
          disabled={issueLoading || !canSubmitIssue}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: "12px",
            border: "none",
            background: issueLoading || !canSubmitIssue ? "rgba(0,0,0,0.08)" : "#1d1d1f",
            color: issueLoading || !canSubmitIssue ? "#aaa" : "#fff",
            fontSize: "13px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            cursor: issueLoading || !canSubmitIssue ? "not-allowed" : "pointer",
          }}
        >
          {issueLoading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
          {issueLoading ? "결제 주문 생성 중..." : "등기부 발급 결제 진행"}
        </button>

        <p
          style={{
            fontSize: "10.5px",
            color:
              issueMessage.includes("실패") || issueMessage.includes("오류") ? "#ff3b30" : "#6e6e73",
            marginTop: "8px",
            minHeight: "14px",
          }}
        >
          {issueMessage ||
            `결제 완료 후 틸코 API로 최신 등기부를 조회하고 AI 권리분석 결과를 저장합니다. 서비스 이용료 기준 ${REGISTRY_ISSUE_PRICE.toLocaleString()}원`}
        </p>
      </div>
    </div>
  );
}
