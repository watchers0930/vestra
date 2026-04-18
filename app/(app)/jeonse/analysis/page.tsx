"use client";

import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common";
import { JeonseInputForm } from "./components/JeonseInputForm";
import { JeonseResultPanel } from "./components/JeonseResultPanel";
import { useJeonseAnalysis } from "./hooks/useJeonseAnalysis";

export default function JeonsePage() {
  const {
    formData, setFormData,
    loading, analysis,
    fraudRisk, fraudLoading,
    docLoading, generatedDoc,
    activeDocType,
    guaranteeResult,
    checklist, setChecklist,
    resultRef,
    handleAnalyze, handleGenerateDoc, copyToClipboard,
  } = useJeonseAnalysis();

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm mb-4">
        <Link href="/jeonse" className="text-primary hover:underline">전세보호</Link>
        <ChevronRight size={14} className="text-muted" strokeWidth={1.5} />
        <span className="font-medium">전세 안전 분석</span>
      </nav>
      <PageHeader icon={Shield} title="전세 안전 분석" description="전세권 설정 및 임차권등기명령 AI 분석" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JeonseInputForm
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          onAnalyze={handleAnalyze}
        />
        <JeonseResultPanel
          loading={loading}
          analysis={analysis}
          fraudRisk={fraudRisk}
          fraudLoading={fraudLoading}
          generatedDoc={generatedDoc}
          activeDocType={activeDocType}
          guaranteeResult={guaranteeResult}
          checklist={checklist}
          setChecklist={setChecklist}
          resultRef={resultRef}
          formData={formData}
          docLoading={docLoading}
          onGenerateDoc={handleGenerateDoc}
          onCopy={copyToClipboard}
        />
      </div>
    </div>
  );
}
