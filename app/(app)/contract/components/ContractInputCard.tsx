"use client";

import { FileSearch, Upload, ClipboardPaste, Loader2 } from "lucide-react";
import { ErrorRetry } from "@/components/common/ErrorRetry";
import { AnalysisLoader } from "@/components/common/AnalysisLoader";
import { SAMPLE_CONTRACTS } from "../constants";
import type { InputMode, SampleContract } from "../types";

interface Props {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  contractText: string;
  setContractText: (text: string) => void;
  setError: (err: string | null) => void;
  fileName: string | null;
  isLoading: boolean;
  error: string | null;
  isDragging: boolean;
  showSampleMenu: boolean;
  setShowSampleMenu: (v: boolean) => void;
  sampleMenuRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
  fillSample: (sample: SampleContract) => void;
}

const MODES = [
  { key: "text" as InputMode, icon: ClipboardPaste, label: "텍스트 입력" },
  { key: "file" as InputMode, icon: Upload,         label: "파일 업로드" },
];

export function ContractInputCard({
  inputMode, setInputMode,
  contractText, setContractText, setError,
  fileName, isLoading, error,
  isDragging, showSampleMenu, setShowSampleMenu,
  sampleMenuRef, fileInputRef,
  handleDrop, handleDragOver, handleDragLeave,
  handleFileChange, handleAnalyze, fillSample,
}: Props) {
  return (
    <>
      <div
        role="form"
        aria-label="계약서 입력"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "20px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        {/* 탭 헤더 */}
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

          {/* 샘플 계약서 드롭다운 */}
          <div style={{ position: "relative" }} ref={sampleMenuRef}>
            <button
              onClick={() => setShowSampleMenu(!showSampleMenu)}
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
              샘플 계약서 ▾
            </button>
            {showSampleMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  zIndex: 50,
                  width: "280px",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.09)",
                  borderRadius: "14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                  padding: "6px",
                }}
              >
                {SAMPLE_CONTRACTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => fillSample(s)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f7"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>{s.label}</div>
                    <div style={{ fontSize: "11.5px", color: "#aeaeb2", marginTop: "2px" }}>{s.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 입력 영역 */}
        <div style={{ padding: "20px" }}>
          {/* 텍스트 입력 */}
          {inputMode === "text" && (
            <>
              <textarea
                value={contractText}
                onChange={(e) => { setContractText(e.target.value); setError(null); }}
                placeholder={"계약서 내용을 여기에 붙여넣으세요...\n\n부동산 임대차계약서, 매매계약서 등의 전문을 입력하면\nAI가 조항별로 분석합니다."}
                aria-label="계약서 텍스트 입력"
                style={{
                  width: "100%",
                  minHeight: "280px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(0,0,0,0.10)",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  resize: "vertical",
                  outline: "none",
                  background: "#fafafa",
                  color: "#1d1d1f",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0071e3"; e.currentTarget.style.background = "#fff"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)"; e.currentTarget.style.background = "#fafafa"; }}
              />
              {contractText && (
                <div style={{ textAlign: "right", fontSize: "11px", color: "#aeaeb2", marginTop: "6px" }}>
                  {contractText.length.toLocaleString()}자 입력됨
                </div>
              )}
            </>
          )}

          {/* 파일 업로드 */}
          {inputMode === "file" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                aria-label={fileName ? `업로드된 파일: ${fileName}. 클릭하여 변경` : "계약서 파일 업로드"}
                style={{
                  border: `2px dashed ${isDragging ? "#0071e3" : fileName ? "#30d158" : "rgba(0,0,0,0.12)"}`,
                  borderRadius: "14px",
                  minHeight: "280px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  cursor: "pointer",
                  background: isDragging ? "rgba(0,113,227,0.04)" : fileName ? "rgba(48,209,88,0.04)" : "#fafafa",
                  transition: "all 0.15s",
                }}
              >
                {fileName ? (
                  <>
                    <div style={{ fontSize: "36px" }}>📋</div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#1a9e45" }}>{fileName}</p>
                      <p style={{ fontSize: "11.5px", color: "#30d158", marginTop: "4px" }}>파일이 선택됐습니다 — 클릭하여 변경</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "36px" }}>{isDragging ? "📂" : "📁"}</div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "13.5px", fontWeight: 500, color: "#3c3c43" }}>파일을 드래그하거나 클릭하여 업로드</p>
                      <p style={{ fontSize: "11.5px", color: "#aeaeb2", marginTop: "4px" }}>.txt, .pdf 파일 지원</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                aria-label="계약서 파일 선택"
                className="hidden"
              />
            </>
          )}

          {/* 에러 */}
          {error && (
            <div style={{ marginTop: "14px" }} role="alert">
              <ErrorRetry
                message={error}
                detail="계약서 내용을 확인하거나 다시 시도해주세요."
                onRetry={() => { setError(null); handleAnalyze(); }}
              />
            </div>
          )}

          {/* 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={!contractText.trim() || isLoading}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: !contractText.trim() || isLoading ? "rgba(0,0,0,0.07)" : "#0071e3",
              color: !contractText.trim() || isLoading ? "#aeaeb2" : "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: !contractText.trim() || isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s",
              boxShadow: !contractText.trim() || isLoading ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
            }}
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" />분석 중...</>
            ) : (
              <><FileSearch size={16} strokeWidth={2} />계약서 AI 분석하기</>
            )}
          </button>
        </div>
      </div>

      {/* 분석 로딩 카드 */}
      {isLoading && (
        <div
          aria-busy="true"
          aria-live="polite"
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1d1d1f", textAlign: "center", marginBottom: "4px" }}>
            계약서 AI 분석 중...
          </p>
          <AnalysisLoader
            steps={["계약서 텍스트 추출 중...", "조항 분석 중...", "판례 검색 중...", "AI 검토 의견 생성 중..."]}
            interval={3000}
          />
        </div>
      )}
    </>
  );
}
