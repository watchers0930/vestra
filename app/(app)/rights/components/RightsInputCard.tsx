"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  CheckCircle,
  Upload,
  ClipboardPaste,
  Loader2,
  Search,
  FileText,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { SliderInput } from "@/components/forms";
import type { InputMode, AnalysisStep } from "../types";
import type { IssuedRegistryAnalysisPayload } from "../hooks/useRightsAnalysis";

interface Props {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  rawText: string;
  setRawText: (t: string) => void;
  estimatedPrice: number;
  setEstimatedPrice: (v: number) => void;
  step: AnalysisStep;
  fileName: string | null;
  isDragging: boolean;
  isExtracting: boolean;
  codefAddress: string;
  setCodefAddress: (v: string) => void;
  codefFetching: boolean;
  setCodefSource: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  loadSample: () => void;
  handleAddressAnalyze: () => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
  applyIssuedRegistryAnalysis: (payload: IssuedRegistryAnalysisPayload) => void;
}

const MODES = [
  { key: "codef" as InputMode, icon: Search,         label: "주소 자동 조회" },
  { key: "file"  as InputMode, icon: Upload,         label: "파일 업로드"   },
  { key: "text"  as InputMode, icon: ClipboardPaste, label: "텍스트 입력"   },
];

const REGISTRY_ISSUE_PRICE = 1000;

interface IssueSearchResult {
  uniqueNo: string;
  address: string;
  realEstateType: string;
  realEstateTypeCode?: string;
}

function normalizeAddress(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function RightsInputCard({
  inputMode, setInputMode,
  rawText, setRawText,
  estimatedPrice, setEstimatedPrice,
  step, fileName,
  isDragging, isExtracting,
  codefAddress, setCodefAddress,
  codefFetching, setCodefSource,
  fileInputRef,
  loadSample, handleAddressAnalyze,
  handleDrop, handleDragOver, handleDragLeave,
  handleFileChange, handleAnalyze, applyIssuedRegistryAnalysis,
}: Props) {
  const isAnalyzing = step !== "idle" && step !== "done";
  const [issueAddress, setIssueAddress] = useState("");
  const [issueOwnerName, setIssueOwnerName] = useState("");
  const [issueUniqueNo, setIssueUniqueNo] = useState("");
  const [issueConsent, setIssueConsent] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueSearching, setIssueSearching] = useState(false);
  const [issueResults, setIssueResults] = useState<IssueSearchResult[]>([]);
  const [selectedIssueTarget, setSelectedIssueTarget] = useState<IssueSearchResult | null>(null);
  const [issuePropertyId, setIssuePropertyId] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const canSubmitIssue = !!(selectedIssueTarget || issueUniqueNo.trim()) && issueOwnerName.trim().length >= 2 && issueConsent;

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
      if (prefill.propertyId) {
        setIssuePropertyId(prefill.propertyId);
      }
      if (prefill.address) {
        setIssueAddress(prefill.address);
      }
      if (prefill.commUniqueNo) {
        setIssueUniqueNo(prefill.commUniqueNo);
        setSelectedIssueTarget({
          address: prefill.address || "",
          uniqueNo: prefill.commUniqueNo,
          realEstateType: "부동산",
        });
      }
      if (prefill.ownerName) {
        setIssueOwnerName(prefill.ownerName);
      }
      setIssueMessage("감시 알림의 물건 정보가 입력되었습니다. 동의 후 최신 등기부를 확인하세요.");
    } catch {
      /* 프리필 실패 시 수동 입력 유지 */
    }
  }, []);

  async function handleIssueSearch() {
    if (issueSearching || issueAddress.trim().length < 2) return;
    setIssueSearching(true);
    setIssueMessage("");
    setIssueResults([]);
    setSelectedIssueTarget(null);
    setIssueUniqueNo("");

    try {
      const res = await fetch(`/api/codef/search?address=${encodeURIComponent(issueAddress.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setIssueMessage(data.error || "조회 대상 확인에 실패했습니다.");
        return;
      }
      const results = (data.results || []) as IssueSearchResult[];
      setIssueResults(results);
      if (results.length === 0) {
        setIssueMessage("검색 결과가 없습니다. 주소를 더 구체적으로 입력해 주세요.");
      } else if (results.length === 1) {
        setSelectedIssueTarget(results[0]);
        setIssueUniqueNo(results[0].uniqueNo);
        setIssueMessage("조회 대상이 확인되었습니다. 소유자명을 확인한 뒤 최신 등기부를 조회하세요.");
      } else {
        setIssueMessage("조회할 부동산을 선택해 주세요.");
      }
    } catch {
      setIssueMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIssueSearching(false);
    }
  }

  function selectIssueTarget(result: IssueSearchResult) {
    setSelectedIssueTarget(result);
    setIssueUniqueNo(result.uniqueNo);
    setIssueMessage("조회 대상이 확인되었습니다. 주소와 소유자명을 확인하세요.");
  }

  async function handleIssueOrder() {
    if (issueLoading) return;
    setIssueLoading(true);
    setIssueMessage("");

    try {
      const res = await fetch("/api/registry/issue-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: issueAddress.trim(),
          registryAddress: selectedIssueTarget?.address || issueAddress.trim(),
          commUniqueNo: selectedIssueTarget?.uniqueNo || issueUniqueNo.trim(),
          realEstateType: selectedIssueTarget?.realEstateTypeCode,
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

  return (
    <div
      className="mb-6"
      role="form"
      aria-label="등기부등본 입력"
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}
    >
      {/* 상단 모드 탭 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {MODES.map(({ key, icon: Icon, label }) => {
            const active = inputMode === key;
            return (
              <button
                key={key}
                onClick={() => setInputMode(key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 14px",
                  borderRadius: "20px",
                  fontSize: "12.5px",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: active ? "none" : "1px solid rgba(0,0,0,0.10)",
                  background: active ? "#0071e3" : "#fff",
                  color: active ? "#fff" : "#6e6e73",
                  boxShadow: active ? "0 2px 8px rgba(0,113,227,0.25)" : "none",
                }}
              >
                <Icon size={13} strokeWidth={active ? 2 : 1.5} />
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={loadSample}
          style={{
            fontSize: "11.5px",
            fontWeight: 500,
            color: "#0071e3",
            background: "rgba(0,113,227,0.06)",
            border: "1px solid rgba(0,113,227,0.15)",
            borderRadius: "20px",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          샘플 데이터
        </button>
      </div>

      {/* 입력 영역 */}
      <div style={{ padding: "20px" }}>
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

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", marginBottom: "8px" }}>
              <input
                value={issueAddress}
                onChange={(e) => {
                  setIssueAddress(e.target.value);
                  setSelectedIssueTarget(null);
                  setIssueUniqueNo("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleIssueSearch()}
                placeholder="부동산 주소를 입력하고 먼저 확인하세요"
                style={{
                  minWidth: 0,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(0,0,0,0.10)",
                  fontSize: "12.5px",
                  outline: "none",
                  background: "#fff",
                }}
              />
              <button
                onClick={handleIssueSearch}
                disabled={issueSearching || issueAddress.trim().length < 2}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 13px",
                  borderRadius: "10px",
                  border: "none",
                  background: issueSearching || issueAddress.trim().length < 2 ? "rgba(0,0,0,0.08)" : "#0071e3",
                  color: issueSearching || issueAddress.trim().length < 2 ? "#aaa" : "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: issueSearching || issueAddress.trim().length < 2 ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {issueSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                대상 확인
              </button>
            </div>

            {issueResults.length > 1 && (
              <div style={{ marginBottom: "10px", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                {issueResults.slice(0, 5).map((result) => {
                  const selected = selectedIssueTarget?.uniqueNo === result.uniqueNo;
                  return (
                    <button
                      key={`${result.uniqueNo}-${result.address}`}
                      onClick={() => selectIssueTarget(result)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        background: selected ? "rgba(0,113,227,0.06)" : "#fff",
                        padding: "9px 11px",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1d1d1f" }}>{result.address}</span>
                      <span style={{ display: "block", marginTop: "2px", fontSize: "10.5px", color: "#86868b" }}>
                        {result.realEstateType || "부동산"} · 고유번호 자동 확인
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedIssueTarget && (
              <div style={{ marginBottom: "10px", border: "1px solid rgba(48,209,88,0.22)", borderRadius: "12px", background: "rgba(48,209,88,0.06)", padding: "10px 12px" }}>
                <p style={{ fontSize: "11px", fontWeight: 800, color: "#1a9e45" }}>조회 대상 확인 완료</p>
                <p style={{ marginTop: "3px", fontSize: "11px", color: "#3c3c43", lineHeight: 1.45 }}>
                  입력 주소: {issueAddress.trim()}
                </p>
                {normalizeAddress(selectedIssueTarget.address) !== normalizeAddress(issueAddress) && (
                  <p style={{ marginTop: "3px", fontSize: "10.5px", color: "#6e6e73", lineHeight: 1.45 }}>
                    등기 조회 대상: {selectedIssueTarget.address}
                  </p>
                )}
                <p style={{ marginTop: "2px", fontSize: "10px", color: "#86868b" }}>부동산 고유번호는 시스템이 자동으로 확인했습니다.</p>
              </div>
            )}

            <input
              value={issueOwnerName}
              onChange={(e) => setIssueOwnerName(e.target.value)}
              placeholder="등기부상 소유자명"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.10)",
                fontSize: "12.5px",
                outline: "none",
                background: "#fff",
                boxSizing: "border-box",
                marginBottom: "10px",
              }}
            />

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
            <p style={{ fontSize: "10.5px", color: issueMessage.includes("실패") || issueMessage.includes("오류") ? "#ff3b30" : "#6e6e73", marginTop: "8px", minHeight: "14px" }}>
              {issueMessage || `결제 완료 후 CODEF 공식 연계로 등기부를 조회하고 분석 결과를 저장합니다. 서비스 이용료 기준 ${REGISTRY_ISSUE_PRICE.toLocaleString()}원`}
            </p>
          </div>
        </div>

        {/* 주소 자동 분석 */}
        {inputMode === "codef" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={codefAddress}
                onChange={(e) => { setCodefAddress(e.target.value); setCodefSource(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddressAnalyze()}
                placeholder="예: 서울시 구로구 구로동 554-24"
                aria-label="부동산 주소"
                disabled={codefFetching}
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(0,0,0,0.10)",
                  fontSize: "13.5px",
                  outline: "none",
                  background: "#fff",
                  color: "#1d1d1f",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0071e3"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)"; }}
              />
              <button
                onClick={handleAddressAnalyze}
                disabled={codefFetching || codefAddress.trim().length < 4}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "11px 20px",
                  borderRadius: "12px",
                  background: codefFetching || codefAddress.trim().length < 4 ? "rgba(0,0,0,0.08)" : "#0071e3",
                  color: codefFetching || codefAddress.trim().length < 4 ? "#aaa" : "#fff",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  border: "none",
                  cursor: codefFetching || codefAddress.trim().length < 4 ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
              >
                {codefFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {codefFetching ? "조회 중..." : "조회"}
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#aeaeb2" }}>
              건축물대장 + 실거래가 공공데이터 기반 · 등기부등본 없이 간이 분석 (권리관계 정보 제한)
            </p>
          </div>
        )}

        {/* 파일 업로드 */}
        {inputMode === "file" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label={fileName ? `업로드된 파일: ${fileName}. 클릭하여 변경` : "등기부등본 파일 업로드. 클릭 또는 드래그"}
            style={{
              border: `2px dashed ${isDragging ? "#0071e3" : fileName ? "#30d158" : "rgba(0,0,0,0.12)"}`,
              borderRadius: "14px",
              padding: "36px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "rgba(0,113,227,0.04)" : fileName ? "rgba(48,209,88,0.04)" : "#fafafa",
              transition: "all 0.15s",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="등기부등본 파일 선택"
            />
            {isExtracting ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <Loader2 size={30} className="animate-spin" style={{ color: "#0071e3" }} />
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#0071e3" }}>텍스트 추출 중...</p>
              </div>
            ) : fileName ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={28} strokeWidth={1.5} style={{ color: "#30d158" }} />
                <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#1a9e45" }}>{fileName}</p>
                <p style={{ fontSize: "11.5px", color: "#30d158" }}>텍스트 추출 완료 ({rawText.length.toLocaleString()}자) — 클릭하여 변경</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <FileText size={30} strokeWidth={1.2} style={{ color: "#aeaeb2" }} />
                <p style={{ fontSize: "13.5px", fontWeight: 500, color: "#3c3c43" }}>등기부등본 PDF 또는 이미지를 드래그하세요</p>
                <p style={{ fontSize: "11.5px", color: "#aeaeb2" }}>PDF, JPG, PNG — 최대 10MB</p>
              </div>
            )}
          </div>
        )}

        {/* 텍스트 직접 입력 */}
        {inputMode === "text" && (
          <textarea
            value={rawText}
            onChange={(e) => { setRawText(e.target.value); setCodefSource(false); }}
            placeholder="등기부등본 텍스트를 붙여넣으세요..."
            aria-label="등기부등본 텍스트 입력"
            style={{
              width: "100%",
              height: "180px",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1.5px solid rgba(0,0,0,0.10)",
              fontSize: "12px",
              fontFamily: "monospace",
              resize: "vertical",
              outline: "none",
              background: "#fafafa",
              color: "#1d1d1f",
              boxSizing: "border-box",
            }}
          />
        )}

        {/* 추정 시세 슬라이더 */}
        {rawText && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px 16px",
              background: "rgba(0,113,227,0.04)",
              borderRadius: "12px",
              border: "1px solid rgba(0,113,227,0.10)",
            }}
          >
            <SliderInput
              label="추정 시세 (선택사항)"
              value={estimatedPrice}
              onChange={setEstimatedPrice}
              min={50000000}
              max={5000000000}
              step={10000000}
              formatValue={formatKRW}
            />
            <p style={{ fontSize: "10.5px", color: "#aeaeb2", marginTop: "4px" }}>
              MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다
            </p>
          </div>
        )}

        {/* 분석 버튼 */}
        <button
          onClick={handleAnalyze}
          disabled={!rawText.trim() || isAnalyzing}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            background: !rawText.trim() || isAnalyzing ? "rgba(0,0,0,0.07)" : "#0071e3",
            color: !rawText.trim() || isAnalyzing ? "#aeaeb2" : "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: !rawText.trim() || isAnalyzing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.15s",
            boxShadow: !rawText.trim() || isAnalyzing ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
          }}
        >
          <Shield size={16} strokeWidth={2} />
          종합 권리분석 시작
        </button>
      </div>
    </div>
  );
}
