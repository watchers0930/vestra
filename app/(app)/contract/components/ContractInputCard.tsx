"use client";

import { FileSearch, Upload, FileText, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button } from "@/components/common";
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
      <Card className="p-6" role="form" aria-label="계약서 입력">
        {/* Tabs */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Button
            icon={ClipboardPaste}
            variant={inputMode === "text" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setInputMode("text")}
          >
            텍스트 입력
          </Button>
          <Button
            icon={Upload}
            variant={inputMode === "file" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setInputMode("file")}
          >
            파일 업로드
          </Button>

          <div className="hidden sm:block flex-1" />

          <div className="relative" ref={sampleMenuRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSampleMenu(!showSampleMenu)}
            >
              샘플 계약서 불러오기
            </Button>
            {showSampleMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-[#e5e5e7] bg-white shadow-lg py-1">
                {SAMPLE_CONTRACTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => fillSample(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors"
                  >
                    <div className="text-sm font-medium text-[#1d1d1f]">{s.label}</div>
                    <div className="text-xs text-[#6e6e73]">{s.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Text Input Mode */}
        {inputMode === "text" && (
          <textarea
            value={contractText}
            onChange={(e) => { setContractText(e.target.value); setError(null); }}
            placeholder="계약서 내용을 여기에 붙여넣으세요...&#10;&#10;예시: 부동산 임대차계약서, 매매계약서 등의 전문을 입력하면 AI가 조항별로 분석합니다."
            aria-label="계약서 텍스트 입력"
            className="min-h-[300px] w-full resize-y rounded-lg border border-[#e5e5e7] bg-[#f5f5f7] p-4 text-sm leading-relaxed text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
          />
        )}

        {/* File Upload Mode */}
        {inputMode === "file" && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label={fileName ? `업로드된 파일: ${fileName}. 클릭하여 변경` : "계약서 파일 업로드 영역. 클릭 또는 드래그하여 업로드"}
              className={cn(
                "flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-[#e5e5e7] bg-[#f5f5f7] hover:border-[#6e6e73] hover:bg-[#e5e5e7]"
              )}
            >
              {fileName ? (
                <>
                  <FileText size={48} className="text-blue-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#1d1d1f]">{fileName}</p>
                    <p className="mt-1 text-xs text-[#6e6e73]">파일이 선택되었습니다. 다른 파일을 선택하려면 클릭하세요.</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={48} className={cn("transition-colors", isDragging ? "text-blue-500" : "text-[#6e6e73]")} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#6e6e73]">파일을 여기로 드래그하거나 클릭하여 업로드</p>
                    <p className="mt-1 text-xs text-[#6e6e73]">.txt, .pdf 파일 지원</p>
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

        {contractText && (
          <div className="mt-2 text-right text-xs text-[#6e6e73]">
            {contractText.length.toLocaleString()}자 입력됨
          </div>
        )}

        {error && (
          <div className="mt-4" role="alert">
            <ErrorRetry
              message={error}
              detail="계약서 내용을 확인하거나 다시 시도해주세요."
              onRetry={() => { setError(null); handleAnalyze(); }}
            />
          </div>
        )}

        <Button
          icon={isLoading ? undefined : FileSearch}
          loading={isLoading}
          disabled={!contractText.trim()}
          fullWidth
          size="lg"
          className="mt-5"
          onClick={handleAnalyze}
        >
          계약서 분석하기
        </Button>
      </Card>

      {isLoading && (
        <Card className="p-6" aria-busy="true" aria-live="polite">
          <p className="text-sm font-medium text-[#1d1d1f] text-center mb-2">계약서 AI 분석 중...</p>
          <AnalysisLoader
            steps={["계약서 텍스트 추출 중...", "조항 분석 중...", "판례 검색 중...", "AI 검토 의견 생성 중..."]}
            interval={3000}
          />
        </Card>
      )}
    </>
  );
}
