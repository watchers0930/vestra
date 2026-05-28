"use client";

import { CategoryHero } from "@/components/common/CategoryHero";
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
    kaptInfo,
    checklist, setChecklist,
    resultRef,
    handleAnalyze, handleGenerateDoc, copyToClipboard,
  } = useJeonseAnalysis();

  return (
    <div style={{ paddingBottom: "48px" }}>
      <CategoryHero
        badge="🛡️ 전세 안전 분석"
        title="전세권 설정 및 임차권등기명령 AI 분석"
        description={<>계약 정보를 입력하면 전세권 설정 필요성과<br />사기 위험도를 AI가 자동 분석합니다.</>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid-cols-1 lg:grid-cols-2">
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
          kaptInfo={kaptInfo}
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
