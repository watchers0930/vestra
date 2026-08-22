"use client";

import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useKeepzipDraft } from "@/lib/keepzip/use-keepzip-draft";
import { CaseForm } from "./components/CaseForm";
import { DraftPanel } from "./components/DraftPanel";

/**
 * 임대인(부동산/임대사업자)용 내용증명 작성 — (app) 대시보드 체계.
 * 임차인(개인)용은 (personal-home)/renewal/keepzip (리뉴얼 체계).
 */
export default function KeepzipNewPage() {
  const { form, draft, loading, error, selectCause, setField, generateDraft, setDraftContent } = useKeepzipDraft();

  return (
    <div style={{ paddingBottom: "48px", paddingTop: "52px" }}>
      <DashboardPageTopbar current="내용증명 작성" primaryHref="/keepzip" primaryLabel="집키퍼" />
      <CategoryHero
        badge="📮 집키퍼 내용증명 (임대인)"
        title="AI 내용증명 작성"
        description={<>임차인에게 보낼 내용증명을 AI가 작성합니다.<br />변호사 검토·직인 후 우체국 등기로 발송됩니다.</>}
      />

      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-start">
          <CaseForm
            form={form}
            loading={loading}
            onSelectCause={selectCause}
            onField={setField}
            onSubmit={generateDraft}
          />
          <DraftPanel
            draft={draft}
            loading={loading}
            error={error}
            senderName={form.senderName}
            onChangeContent={setDraftContent}
          />
        </div>
      </div>
    </div>
  );
}
