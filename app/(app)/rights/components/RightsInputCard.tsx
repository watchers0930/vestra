"use client";

import { useState } from "react";
import {
  Shield,
  CheckCircle,
  Upload,
  ClipboardPaste,
  Loader2,
  Search,
  FileText,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { SliderInput } from "@/components/forms";
import type { InputMode, AnalysisStep } from "../types";
import type { IssuedRegistryAnalysisPayload } from "../hooks/useRightsAnalysis";
import { RegistryIssueSection } from "./RegistryIssueSection";

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
  tilkoAddress: string;
  setTilkoAddress: (v: string) => void;
  tilkoFetching: boolean;
  setTilkoSource: (v: boolean) => void;
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
  { key: "tilko" as InputMode, icon: Search,         label: "주소 자동 조회" },
  { key: "file"  as InputMode, icon: Upload,         label: "파일 업로드"   },
  { key: "text"  as InputMode, icon: ClipboardPaste, label: "텍스트 입력"   },
];

export function RightsInputCard({
  inputMode, setInputMode,
  rawText, setRawText,
  estimatedPrice, setEstimatedPrice,
  step, fileName,
  isDragging, isExtracting,
  tilkoAddress, setTilkoAddress,
  tilkoFetching, setTilkoSource,
  fileInputRef,
  loadSample, handleAddressAnalyze,
  handleDrop, handleDragOver, handleDragLeave,
  handleFileChange, handleAnalyze, applyIssuedRegistryAnalysis,
}: Props) {
  const isAnalyzing = step !== "idle" && step !== "done";

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
        <RegistryIssueSection applyIssuedRegistryAnalysis={applyIssuedRegistryAnalysis} />

        {/* 주소 자동 분석 */}
        {inputMode === "tilko" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={tilkoAddress}
                onChange={(e) => { setTilkoAddress(e.target.value); setTilkoSource(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddressAnalyze()}
                placeholder="예: 서울시 구로구 구로동 554-24"
                aria-label="부동산 주소"
                disabled={tilkoFetching}
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
                disabled={tilkoFetching || tilkoAddress.trim().length < 4}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "11px 20px",
                  borderRadius: "12px",
                  background: tilkoFetching || tilkoAddress.trim().length < 4 ? "rgba(0,0,0,0.08)" : "#0071e3",
                  color: tilkoFetching || tilkoAddress.trim().length < 4 ? "#aaa" : "#fff",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  border: "none",
                  cursor: tilkoFetching || tilkoAddress.trim().length < 4 ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
              >
                {tilkoFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {tilkoFetching ? "조회 중..." : "조회"}
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
            onChange={(e) => { setRawText(e.target.value); setTilkoSource(false); }}
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
