"use client";

import {
  Shield,
  CheckCircle,
  Upload,
  ClipboardPaste,
  Loader2,
  Search,
} from "lucide-react";
import { formatKRW, cn } from "@/lib/utils";
import { Card } from "@/components/common";
import { SliderInput } from "@/components/forms";
import type { InputMode, AnalysisStep } from "../types";

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
  handleFileChange, handleAnalyze,
}: Props) {
  return (
    <Card className="p-6 mb-6" role="form" aria-label="등기부등본 입력">
      {/* 입력 모드 토글 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setInputMode("codef")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all",
            inputMode === "codef" ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-secondary border-border hover:bg-[#f5f5f7]")}
        >
          <Search size={14} /> 주소로 자동 조회
        </button>
        <button
          onClick={() => setInputMode("file")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all",
            inputMode === "file" ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-secondary border-border hover:bg-[#f5f5f7]")}
        >
          <Upload size={14} /> 파일 업로드
        </button>
        <button
          onClick={() => setInputMode("text")}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all",
            inputMode === "text" ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-secondary border-border hover:bg-[#f5f5f7]")}
        >
          <ClipboardPaste size={14} /> 텍스트 입력
        </button>
        <button
          onClick={loadSample}
          className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary hover:bg-[#f5f5f7] transition-all"
        >
          샘플 데이터
        </button>
      </div>

      {/* 주소 자동 분석 */}
      {inputMode === "codef" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={codefAddress}
              onChange={(e) => { setCodefAddress(e.target.value); setCodefSource(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddressAnalyze()}
              placeholder="예: 서울시 구로구 구로동 554-24"
              aria-label="부동산 주소"
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={codefFetching}
            />
            <button
              onClick={handleAddressAnalyze}
              disabled={codefFetching || codefAddress.trim().length < 4}
              className="px-4 py-2.5 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#1d1d1f]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              {codefFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {codefFetching ? "분석 중..." : "분석하기"}
            </button>
          </div>
          <p className="text-[10px] text-[#6e6e73]">
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
          aria-label={fileName ? `업로드된 파일: ${fileName}. 클릭하여 변경` : "등기부등본 파일 업로드 영역. 클릭 또는 드래그하여 업로드"}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragging ? "border-primary bg-primary/5" : fileName ? "border-emerald-300 bg-emerald-50" : "border-border hover:border-primary/50 hover:bg-[#f5f5f7]"
          )}
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
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-primary font-medium">텍스트 추출 중...</p>
            </div>
          ) : fileName ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle size={32} className="text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">{fileName}</p>
              <p className="text-xs text-emerald-600">텍스트 추출 완료 ({rawText.length.toLocaleString()}자) — 클릭하여 변경</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} className="text-[#6e6e73]" />
              <p className="text-sm text-[#6e6e73]">등기부등본 PDF 또는 이미지를 드래그하세요</p>
              <p className="text-xs text-[#6e6e73]">PDF, JPG, PNG (최대 10MB)</p>
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
          className="w-full h-48 px-4 py-3 rounded-lg border border-border text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}

      {/* 추정 시세 슬라이더 */}
      {rawText && (
        <div className="mt-4 p-3 bg-[#f5f5f7] rounded-lg">
          <SliderInput
            label="추정 시세 (선택사항)"
            value={estimatedPrice}
            onChange={setEstimatedPrice}
            min={50000000}
            max={5000000000}
            step={10000000}
            formatValue={formatKRW}
          />
          <p className="text-[10px] text-[#6e6e73] mt-1">MOLIT 실거래 데이터가 있으면 자동으로 시세를 반영합니다</p>
        </div>
      )}

      {/* 분석 버튼 (fileType prop으로 fileType 표시 제거 — 슬라이더 조건에만 rawText 사용) */}
      <button
        onClick={handleAnalyze}
        disabled={!rawText.trim() || (step !== "idle" && step !== "done")}
        className="mt-4 w-full py-3 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#1d1d1f]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        <Shield size={16} />
        종합 권리분석 시작
      </button>
    </Card>
  );
}
