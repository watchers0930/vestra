"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { ScrFileUploadStep } from "./ScrFileUploadStep";
import { ScrDataReviewStep } from "./ScrDataReviewStep";
import {
  DOCUMENT_SLOTS,
  type ScrReportData,
  type ProjectType,
  type ScrDocumentCategory,
} from "@/lib/feasibility/scr-types";
import type { ScrClaimKey } from "@/lib/feasibility/scr-claim-keys";

interface ScrReportWizardProps {
  onComplete: (report: ScrReportData) => void;
}

/** 파싱된 항목 하나 */
export interface ParsedClaimItem {
  key: ScrClaimKey;
  value: string | number | null;
  confidence: number; // 0~1
  sourceCategory?: ScrDocumentCategory;
}

const STEPS = [
  { label: "파일 업로드", description: "분석할 문서를 업로드하세요" },
  { label: "데이터 검토", description: "파싱 결과를 확인하고 수정하세요" },
  { label: "보고서 생성", description: "SCR 보고서를 생성합니다" },
] as const;

export function ScrReportWizard({ onComplete }: ScrReportWizardProps) {
  const [step, setStep] = useState(0);
  const [categorizedFiles, setCategorizedFiles] = useState<Map<ScrDocumentCategory, File[]>>(new Map());
  const [projectType, setProjectType] = useState<ProjectType>("아파트");
  const [parsedItems, setParsedItems] = useState<ParsedClaimItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [requiredWarning, setRequiredWarning] = useState(false);

  /** 필수 서류 충족 여부 */
  const isRequiredComplete = useMemo(() => {
    const requiredCategories = DOCUMENT_SLOTS
      .filter((s) => s.required)
      .map((s) => s.category);
    return requiredCategories.every(
      (cat) => (categorizedFiles.get(cat)?.length ?? 0) > 0
    );
  }, [categorizedFiles]);

  /** 총 파일 수 */
  const totalFileCount = useMemo(() => {
    let count = 0;
    categorizedFiles.forEach((files) => {
      count += files.length;
    });
    return count;
  }, [categorizedFiles]);

  /* Step 1 → 2: 파싱 시뮬레이션 (실제 API 연결 시 교체) */
  const handleFilesNext = useCallback(async () => {
    if (!isRequiredComplete) {
      setRequiredWarning(true);
      return;
    }
    setRequiredWarning(false);

    // TODO: 실제 파싱 API 호출 — categorizedFiles를 FormData로 변환
    // const formData = new FormData();
    // categorizedFiles.forEach((files, category) => {
    //   files.forEach((file, idx) => {
    //     formData.append(`file_${category}_${idx}`, file);
    //     formData.append(`category_${category}_${idx}`, category);
    //   });
    // });

    setParsedItems([]);
    setStep(1);
  }, [isRequiredComplete, categorizedFiles]);

  /* Step 2 → 3: 보고서 생성 */
  const handleGenerate = useCallback(async () => {
    setStep(2);
    setGenerating(true);
    setProgress(0);

    // 진행률 시뮬레이션
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          clearInterval(timer);
          return 95;
        }
        return p + Math.random() * 12;
      });
    }, 400);

    try {
      // TODO: 실제 보고서 생성 API 호출
      await new Promise((resolve) => setTimeout(resolve, 3000));
      clearInterval(timer);
      setProgress(100);

      // 임시 — onComplete 호출 시 실제 ScrReportData 전달
      setTimeout(() => {
        onComplete({} as ScrReportData);
      }, 500);
    } catch {
      clearInterval(timer);
      setGenerating(false);
    }
  }, [onComplete]);

  const handleItemChange = useCallback(
    (key: ScrClaimKey, value: string | number | null) => {
      setParsedItems((prev) =>
        prev.map((item) => (item.key === key ? { ...item, value } : item))
      );
    },
    []
  );

  const canNext =
    step === 0 ? isRequiredComplete :
    step === 1 ? true :
    false;

  return (
    <div className="space-y-6">
      {/* ─── 스텝 인디케이터 ─── */}
      <div className="flex items-center gap-3">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            {i > 0 && (
              <div className={cn(
                "h-px w-8 transition-colors",
                i <= step ? "bg-[#0071e3]" : "bg-gray-200"
              )} />
            )}
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                  i < step
                    ? "bg-[#0071e3] text-white"
                    : i === step
                    ? "bg-[#0071e3]/10 text-[#0071e3] ring-2 ring-[#0071e3]/30"
                    : "bg-gray-100 text-[#6e6e73]"
                )}
              >
                {i < step ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <p className={cn(
                  "text-xs font-semibold",
                  i <= step ? "text-[#1d1d1f]" : "text-[#6e6e73]"
                )}>
                  {s.label}
                </p>
                <p className="text-[10px] text-[#86868b]">{s.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 스텝 내용 ─── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none">
        <div className="p-5">
          {step === 0 && (
            <ScrFileUploadStep
              projectType={projectType}
              onProjectTypeChange={setProjectType}
              categorizedFiles={categorizedFiles}
              onFilesChange={setCategorizedFiles}
            />
          )}

          {step === 1 && (
            <ScrDataReviewStep
              items={parsedItems}
              onItemChange={handleItemChange}
            />
          )}

          {step === 2 && (
            <div className="py-16 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center">
                {progress >= 100 ? (
                  <Check size={28} className="text-emerald-500" strokeWidth={2} />
                ) : (
                  <Loader2 size={28} className="text-[#0071e3] animate-spin" strokeWidth={1.5} />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#1d1d1f]">
                  {progress >= 100 ? "보고서 생성 완료" : "SCR 보고서 생성 중..."}
                </p>
                <p className="text-xs text-[#6e6e73] mt-1">
                  {progress >= 100
                    ? "보고서가 성공적으로 생성되었습니다."
                    : "AI가 데이터를 분석하고 보고서를 구성하고 있습니다."}
                </p>
              </div>
              {/* 프로그레스 바 */}
              <div className="w-full max-w-sm">
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0071e3] transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#86868b] text-right mt-1 tabular-nums">
                  {Math.min(100, Math.round(progress))}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── 하단 버튼 ─── */}
        {step < 2 && (
          <div className="px-5 py-4 border-t border-gray-100">
            {/* 필수 미충족 경고 */}
            {step === 0 && requiredWarning && !isRequiredComplete && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">
                  필수 서류 4종을 모두 제출해야 다음 단계로 진행할 수 있습니다.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setRequiredWarning(false);
                  setStep((s) => Math.max(0, s - 1));
                }}
                disabled={step === 0}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  step === 0
                    ? "text-[#86868b] cursor-not-allowed"
                    : "text-[#1d1d1f] hover:bg-gray-50"
                )}
              >
                <ChevronLeft size={14} />
                이전
              </button>

              {step === 1 ? (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-all shadow-sm"
                >
                  <Sparkles size={14} />
                  보고서 생성
                </button>
              ) : (
                <button
                  onClick={handleFilesNext}
                  disabled={totalFileCount === 0}
                  className={cn(
                    "flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    totalFileCount > 0
                      ? "bg-[#0071e3] text-white hover:bg-[#0077ED] shadow-sm"
                      : "bg-gray-100 text-[#86868b] cursor-not-allowed"
                  )}
                >
                  다음
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
