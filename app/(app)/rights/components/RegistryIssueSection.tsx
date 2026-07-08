"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReceiptText, CreditCard, Loader2, CheckCircle, AlertCircle, MapPin } from "lucide-react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
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
  const { data: session } = useSession();
  const router = useRouter();
  const postcodeReadyRef = useRef(false);
  // Toss SDK를 미리 로드해서 클릭 시 팝업 차단 방지
  const tossRef = useRef<Awaited<ReturnType<typeof loadTossPayments>> | null>(null);

  useEffect(() => {
    fetch("/api/payment/config")
      .then((r) => r.json())
      .then(({ clientKey }) => {
        if (clientKey) loadTossPayments(clientKey).then((t) => { tossRef.current = t; });
      })
      .catch(() => {});
  }, []);

  // 다음 주소 스크립트 로드
  useEffect(() => {
    if (window.daum?.Postcode) { postcodeReadyRef.current = true; return; }
    const existing = document.getElementById("daum-postcode-script");
    if (existing) { existing.addEventListener("load", () => { postcodeReadyRef.current = true; }); return; }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => { postcodeReadyRef.current = true; };
    document.head.appendChild(script);
  }, []);

  const openAddressSearch = useCallback(() => {
    const open = () => new window.daum!.Postcode({
      oncomplete: (data) => {
        const base = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        const addr = data.buildingName ? `${base} (${data.buildingName})` : base;
        setIssueAddress(addr);
      },
    }).open();

    if (postcodeReadyRef.current && window.daum?.Postcode) {
      open();
    } else {
      const script = document.getElementById("daum-postcode-script");
      if (script) {
        script.addEventListener("load", open, { once: true });
      } else {
        open();
      }
    }
  }, []);

  const [issueAddress, setIssueAddress] = useState("");
  const [issueOwnerName, setIssueOwnerName] = useState("");
  const [issueConsent, setIssueConsent] = useState(false);
  const [issuePropertyId, setIssuePropertyId] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [isApartment, setIsApartment] = useState(false);
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<"idle" | "confirming" | "executing" | "done" | "error">("idle");

  useEffect(() => {
    setIsApartment(detectApartment(issueAddress));
  }, [issueAddress]);

  // 감시 알림 프리필
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("issue") !== "1") return;
    const raw = sessionStorage.getItem("vestra_registry_issue_prefill");
    if (!raw) return;
    try {
      const prefill = JSON.parse(raw) as { propertyId?: string; address?: string; ownerName?: string };
      if (prefill.propertyId) setIssuePropertyId(prefill.propertyId);
      if (prefill.address) setIssueAddress(prefill.address);
      if (prefill.ownerName) setIssueOwnerName(prefill.ownerName);
      setIssueMessage("감시 알림의 물건 정보가 입력되었습니다. 동의 후 최신 등기부를 확인하세요.");
    } catch { /* 무시 */ }
  }, []);

  // 토스 결제 결과 처리 (리다이렉트 복귀)
  const handlePaymentReturn = useCallback(async (paymentKey: string, orderId: string, amount: number) => {
    setPaymentPhase("confirming");
    setIssueMessage("결제 확인 중...");

    // 1. 결제 검증
    const confirmRes = await fetch("/api/registry/payment/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const confirmData = await confirmRes.json();

    if (!confirmRes.ok) {
      setPaymentPhase("error");
      setIssueMessage(confirmData.error || "결제 확인에 실패했습니다.");
      router.replace("/rights");
      return;
    }

    // 2. 등기부 발급 실행
    setPaymentPhase("executing");
    setIssueMessage("등기부 조회 및 AI 권리분석 중...");

    const executeRes = await fetch("/api/registry/issue-order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const executeData = await executeRes.json();

    router.replace("/rights");

    if (!executeRes.ok) {
      setPaymentPhase("error");
      setIssueMessage(executeData.error || "등기부 발급 중 오류가 발생했습니다.");
      return;
    }

    setPaymentPhase("done");
    setIssueMessage(`등기부 발급 및 AI 권리분석 완료. 주문번호 ${orderId}`);
    applyIssuedRegistryAnalysis(executeData as IssuedRegistryAnalysisPayload);
  }, [applyIssuedRegistryAnalysis, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    if (status === "success") {
      const paymentKey = params.get("paymentKey") || "";
      const orderId = params.get("orderId") || "";
      const amount = Number(params.get("amount") || 0);
      handlePaymentReturn(paymentKey, orderId, amount);
    } else if (status === "fail") {
      const message = params.get("message") || "결제가 취소되었거나 실패했습니다.";
      setPaymentPhase("error");
      setIssueMessage(message);
      router.replace("/rights");
    }
  }, [handlePaymentReturn, router]);

  const canSubmit = issueAddress.trim().length >= 5 && issueOwnerName.trim().length >= 2 && issueConsent;
  const isProcessing = loading || paymentPhase === "confirming" || paymentPhase === "executing";

  async function handlePayment() {
    if (isProcessing || !canSubmit) return;
    setLoading(true);
    setIssueMessage("");

    try {
      const unitPart = [dong.trim() ? `${dong.trim()}동` : "", ho.trim() ? `${ho.trim()}호` : ""].filter(Boolean).join(" ");
      const fullAddress = isApartment && unitPart ? `${issueAddress.trim()} ${unitPart}` : issueAddress.trim();

      // 1. 주문 생성
      const orderRes = await fetch("/api/registry/issue-order", {
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
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setIssueMessage(orderData.error || "주문 생성에 실패했습니다.");
        return;
      }

      // 2. Toss SDK (마운트 시 미리 로드됨, 없으면 즉시 로드)
      let toss = tossRef.current;
      if (!toss) {
        const configRes = await fetch("/api/payment/config");
        const { clientKey } = await configRes.json();
        if (!clientKey) {
          setIssueMessage("결제 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
          return;
        }
        toss = await loadTossPayments(clientKey);
        tossRef.current = toss;
      }

      // 3. 토스 결제창 오픈
      const customerKey = session?.user?.id ?? `anon-${Date.now()}`;
      const payment = toss.payment({ customerKey });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: orderData.order.amount },
        orderId: orderData.order.orderId,
        orderName: "등기부 조회 및 AI 권리분석",
        successUrl: `${window.location.origin}/rights?payment=success`,
        failUrl: `${window.location.origin}/rights?payment=fail`,
      });
    } catch (err: unknown) {
      let msg = "결제 중 오류가 발생했습니다.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === "object" && "message" in err) {
        msg = String((err as { message: unknown }).message);
      }
      if (!msg.includes("PAY_PROCESS_CANCELED")) {
        setIssueMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.10)",
    fontSize: "13px",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    marginBottom: "8px",
  };

  const isError = paymentPhase === "error" || (issueMessage.includes("실패") || issueMessage.includes("오류") || issueMessage.includes("취소"));

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
            <p style={{ fontSize: "13px", color: "#6e6e73", lineHeight: 1.55 }}>
              공식 연계 API로 최신 등기부 정보를 조회하고, 수신 즉시 권리분석과 기준 스냅샷 저장에 사용합니다.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "13px", color: "#86868b" }}>조회+AI 분석 기준가</p>
            <p style={{ fontSize: "18px", fontWeight: 900, color: "#0071e3" }}>{REGISTRY_ISSUE_PRICE.toLocaleString()}원</p>
          </div>
        </div>

        {/* 결제 처리 중 오버레이 */}
        {(paymentPhase === "confirming" || paymentPhase === "executing") && (
          <div style={{ textAlign: "center", padding: "20px 0", marginBottom: "12px" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "#0071e3", margin: "0 auto 10px" }} />
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0071e3" }}>
              {paymentPhase === "confirming" ? "결제 확인 중..." : "등기부 조회 및 AI 권리분석 중..."}
            </p>
            <p style={{ fontSize: "13px", color: "#6e6e73", marginTop: "4px" }}>잠시만 기다려주세요.</p>
          </div>
        )}

        {paymentPhase === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0", marginBottom: "12px" }}>
            <CheckCircle size={28} style={{ color: "#30d158", margin: "0 auto 8px" }} />
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a9e45" }}>분석이 완료되었습니다.</p>
          </div>
        )}

        {/* 입력 폼 (처리 중/완료가 아닐 때) */}
        {paymentPhase === "idle" || paymentPhase === "error" ? (
          <>
            {/* 주소 검색 (다음 주소) */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <input
                value={issueAddress}
                readOnly
                placeholder="주소 검색 버튼을 눌러 주소를 선택하세요"
                style={{ ...inputStyle, marginBottom: 0, flex: 1, cursor: "default", background: issueAddress ? "#fff" : "#f5f5f7", color: issueAddress ? "#1d1d1f" : "#86868b" }}
              />
              <button
                type="button"
                onClick={openAddressSearch}
                disabled={isProcessing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1px solid rgba(0,113,227,0.25)",
                  background: "rgba(0,113,227,0.07)",
                  color: "#0071e3",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <MapPin size={13} />
                주소 검색
              </button>
            </div>

            {/* 집합건물 여부 */}
            <label style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isApartment}
                onChange={(e) => { setIsApartment(e.target.checked); if (!e.target.checked) { setDong(""); setHo(""); } }}
                disabled={isProcessing}
              />
              <span style={{ fontSize: "13px", color: "#3c3c43", fontWeight: 500 }}>
                집합건물 (아파트·오피스텔·빌라 등)
              </span>
              {isApartment && detectApartment(issueAddress) && (
                <span style={{ fontSize: "13px", color: "#0071e3", background: "rgba(0,113,227,0.08)", borderRadius: "6px", padding: "1px 7px" }}>
                  자동 감지
                </span>
              )}
            </label>

            {/* 동호수 */}
            {isApartment && (
              <>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dong}
                    onChange={(e) => setDong(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="동"
                    disabled={isProcessing}
                    style={{ ...inputStyle, marginBottom: 0, width: "80px", textAlign: "center", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "13px", color: "#3c3c43", flexShrink: 0 }}>동</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ho}
                    onChange={(e) => setHo(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="호"
                    disabled={isProcessing}
                    style={{ ...inputStyle, marginBottom: 0, width: "80px", textAlign: "center", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "13px", color: "#3c3c43", flexShrink: 0 }}>호</span>
                </div>
                {(!dong.trim() || !ho.trim()) && (
                  <p style={{ fontSize: "13px", color: "#ff9500", marginBottom: "8px", marginTop: "-4px" }}>
                    ⚠ 동호수 미입력 시 소유자명 기준으로 조회되어 정확도가 낮아질 수 있습니다.
                  </p>
                )}
              </>
            )}

            {/* 소유자명 */}
            <input
              value={issueOwnerName}
              onChange={(e) => setIssueOwnerName(e.target.value)}
              placeholder={isApartment && (!dong.trim() || !ho.trim()) ? "등기부상 소유자명 (필수)" : "등기부상 소유자명"}
              style={{
                ...inputStyle,
                borderColor: isApartment && (!dong.trim() || !ho.trim()) && !issueOwnerName.trim() ? "rgba(255,149,0,0.4)" : "rgba(0,0,0,0.10)",
              }}
              disabled={isProcessing}
            />

            {/* 동의 */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={issueConsent}
                onChange={(e) => setIssueConsent(e.target.checked)}
                style={{ marginTop: "2px" }}
                disabled={isProcessing}
              />
              <span style={{ fontSize: "13px", color: "#6e6e73", lineHeight: 1.45 }}>
                베스트라의 등기부 조회 및 AI 권리분석 서비스를 위해 입력 정보를 공식 연계 조회 사업자에 전송하고, 조회된 문서를 권리분석 및 감시 기준 스냅샷에 사용하는 데 동의합니다.
              </span>
            </label>

            {/* 결제 버튼 */}
            <button
              onClick={handlePayment}
              disabled={isProcessing || !canSubmit}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "12px",
                border: "none",
                background: isProcessing || !canSubmit ? "rgba(0,0,0,0.08)" : "#1d1d1f",
                color: isProcessing || !canSubmit ? "#aaa" : "#fff",
                fontSize: "13px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                cursor: isProcessing || !canSubmit ? "not-allowed" : "pointer",
              }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
              {loading ? "결제창 로딩 중..." : "등기부 발급 결제 진행"}
            </button>
          </>
        ) : null}

        {/* 상태 메시지 */}
        {issueMessage && (
          <p style={{
            fontSize: "13px",
            color: isError ? "#ff3b30" : "#6e6e73",
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
            {isError && <AlertCircle size={11} />}
            {issueMessage}
          </p>
        )}
        {!issueMessage && paymentPhase === "idle" && (
          <p style={{ fontSize: "13px", color: "#6e6e73", marginTop: "8px" }}>
            결제 완료 후 틸코 API로 최신 등기부를 조회하고 AI 권리분석 결과를 저장합니다. 서비스 이용료 기준 {REGISTRY_ISSUE_PRICE.toLocaleString()}원
          </p>
        )}
      </div>
    </div>
  );
}
