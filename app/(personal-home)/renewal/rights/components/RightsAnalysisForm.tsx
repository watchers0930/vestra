"use client";

import { useState, useEffect, type RefObject } from "react";
import s from "../rights-renewal.module.css";
import type { InputMode, AnalysisStep } from "@/app/(app)/rights/types";

type Mode = "addr" | "file";

interface Props {
  step: AnalysisStep;
  tilkoAddress: string;
  setTilkoAddress: (v: string) => void;
  tilkoFetching: boolean;
  isExtracting: boolean;
  fileName: string | null;
  rawText: string;
  estimatedPrice: number;
  setEstimatedPrice: (v: number) => void;
  setInputMode: (m: InputMode) => void;
  setTilkoSource: (v: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressAnalyze: (addrOverride?: string) => void;
  handleAnalyze: () => void;
}

/** 권리분석 입력 폼 — 주소 조회 / 파일 업로드 모드를 훅 핸들러에 결선. */
export default function RightsAnalysisForm({
  step,
  tilkoAddress,
  setTilkoAddress,
  tilkoFetching,
  isExtracting,
  fileName,
  rawText,
  estimatedPrice,
  setEstimatedPrice,
  setInputMode,
  setTilkoSource,
  fileInputRef,
  handleFileChange,
  handleAddressAnalyze,
  handleAnalyze,
}: Props) {
  const [mode, setMode] = useState<Mode>("addr");
  const [detail, setDetail] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const busy = tilkoFetching || isExtracting || (step !== "idle" && step !== "done");

  // 폼 모드에 맞춰 훅 inputMode 동기화 (초기값 포함)
  useEffect(() => {
    setInputMode(mode === "addr" ? "tilko" : "file");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 하드코딩 기본 시세(8.5억) 제거 — 빈 값으로 시작, 실입력·MOLIT 자동반영만 사용
  useEffect(() => {
    setEstimatedPrice(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === "file") setTilkoSource(false);
  };

  const priceEok = estimatedPrice > 0 ? String(estimatedPrice / 100_000_000) : "";
  const onPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setEstimatedPrice(Number.isFinite(v) && v > 0 ? Math.round(v * 100_000_000) : 0);
  };

  const combinedAddr = [tilkoAddress.trim(), detail.trim()].filter(Boolean).join(" ");

  const runAnalyze = () => {
    if (busy) return;
    if (mode === "addr") {
      if (!tilkoAddress.trim()) return;
      handleAddressAnalyze(combinedAddr);
    } else {
      if (!rawText.trim()) return;
      handleAnalyze();
    }
  };

  const analyzeDisabled =
    busy || (mode === "addr" ? !tilkoAddress.trim() : !rawText.trim());

  return (
    <div className={s.analysisSticky}>
      <div className={s.acard}>
        <div className={s.acardHead}>
          <div className={s.modePills}>
            <button
              className={`${s.modePill} ${mode === "addr" ? s.on : ""}`}
              onClick={() => switchMode("addr")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              주소 조회
            </button>
            <button
              className={`${s.modePill} ${mode === "file" ? s.on : ""}`}
              onClick={() => switchMode("file")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              파일 업로드
            </button>
          </div>
        </div>

        <div className={s.acardBody}>
          {/* 주소 조회 모드 */}
          {mode === "addr" && (
            <div>
              <div className={s.addrSearchRow}>
                <input
                  className={`${s.addrInput} ${s.addrMain} ${tilkoAddress ? s.filled : ""}`}
                  type="text"
                  placeholder="도로명 또는 지번 주소 입력"
                  value={tilkoAddress}
                  onChange={(e) => setTilkoAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setShowDetail(true)}
                />
                <button
                  className={s.addrSearchBtn}
                  onClick={() => tilkoAddress.trim() && setShowDetail(true)}
                >
                  조회
                </button>
              </div>
              {showDetail && (
                <input
                  className={`${s.addrInput} ${s.addrDetail}`}
                  type="text"
                  placeholder="동, 호수 입력 (예: 101동 1504호)"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  style={{ marginTop: "8px" }}
                  autoFocus
                />
              )}
              <p className={s.addrHint} style={{ marginTop: "8px" }}>
                틸코 등기부 + 실거래가 공공데이터 기반으로 분석합니다.<br />
                아파트·공동주택은 동·호수까지 입력하면 더 정확합니다.
              </p>
            </div>
          )}

          {/* 파일 업로드 모드 */}
          {mode === "file" && (
            <div>
              <div className={s.addrSearchRow}>
                <input
                  className={`${s.addrInput} ${s.addrMain} ${fileName ? s.filled : ""}`}
                  type="text"
                  placeholder={isExtracting ? "텍스트 추출 중..." : "등기부등본 파일을 선택하세요"}
                  value={fileName ?? ""}
                  readOnly
                />
                <button
                  className={s.addrSearchBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                >
                  파일 선택
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <p className={s.addrHint} style={{ marginTop: "8px" }}>
                PDF · JPG · PNG · 최대 10MB — AI가 자동으로 텍스트를 추출합니다
              </p>
            </div>
          )}

          {/* 추정 시세 입력 */}
          <div className={s.priceBox}>
            <div className={s.priceLabel}>추정 시세 (선택사항)</div>
            <div className={s.priceInputRow}>
              <input
                className={s.priceInput}
                type="number"
                min="0"
                step="0.1"
                placeholder="예: 8.5"
                value={priceEok}
                onChange={onPriceChange}
              />
              <span className={s.priceUnit}>억 원</span>
            </div>
            <div className={s.priceHint}>MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다</div>
          </div>

          {/* 분석 버튼 */}
          <button className={s.analyzeBtn} onClick={runAnalyze} disabled={analyzeDisabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {busy ? "분석 중..." : "종합 권리분석 시작"}
          </button>
        </div>
      </div>
    </div>
  );
}
