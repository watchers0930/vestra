"use client";

import { useState } from "react";
import s from "./keepzip-renewal.module.css";
import { useToast } from "@/components/common/toast";
import { useKeepzipJourney } from "./hooks/useKeepzipJourney";
import { StepIndicator } from "./components/StepIndicator";
import { Step1Input } from "./components/Step1Input";
import { Step2Draft } from "./components/Step2Draft";
import { Step3Review } from "./components/Step3Review";
import { Step4Payment } from "./components/Step4Payment";
import { Step5Tracking, type Delivery } from "./components/Step5Tracking";
import { Step6AfterCare } from "./components/Step6AfterCare";

interface Props {
  lawyerName?: string;
  lawyerId?: string;
}

const TRACKING_NO = "1234-5678-9012"; // 데모 등기번호 (실서비스: 포스트플러스 발송 응답값)

/** 집키퍼 임차인 단일 여정 컨테이너 — 작성 → 검토·결제 → 발송·사후관리. */
export function KeepzipJourney({ lawyerName, lawyerId }: Props) {
  const { showToast } = useToast();
  const j = useKeepzipJourney({ lawyerName, lawyerId, onError: (m) => showToast(m, "error") });
  const [delivery, setDelivery] = useState<Delivery>("sending");

  const reset = () => { if (typeof window !== "undefined") window.location.reload(); };
  const selectUpsell = () => showToast("해당 절차 연동은 준비 중입니다.", "info");

  return (
    <div className={s.body}>
      <StepIndicator view={j.view} />

      {j.view === "compose" && (
        <div className={s.grid}>
          <Step1Input
            form={j.form}
            econtractId={j.econtractId}
            loading={j.loading}
            lawyerName={j.lawyerName}
            selectCause={j.selectCause}
            setField={j.setField}
            prefillFromContract={j.prefillFromContract}
            clearContract={j.clearContract}
            onGenerate={j.generateDraft}
          />
          <Step2Draft
            draft={j.draft}
            loading={j.loading}
            error={j.error}
            senderName={j.form.senderName}
            signature={j.signature}
            submitting={j.submitting}
            setDraftContent={j.setDraftContent}
            setSignature={j.setSignature}
            onRequestReview={j.requestReview}
            onError={(m) => showToast(m, "error")}
          />
        </div>
      )}

      {j.view === "review" && (
        <>
          <Step3Review
            lawyerName={j.lawyerName}
            approved={j.caseStatus === "approved"}
            onApprove={() => j.setCaseStatus("approved")}
          />
          {j.caseStatus === "approved" && (
            <Step4Payment
              onPaid={() => {
                j.setCaseStatus("paid");
                setDelivery("sending");
                j.goView("track");
                showToast("결제 완료 — 우체국 등기로 발송되었습니다.", "success");
              }}
            />
          )}
        </>
      )}

      {j.view === "track" && (
        <>
          <Step5Tracking delivery={delivery} trackingNo={TRACKING_NO} setDelivery={setDelivery} />
          {delivery !== "sending" && (
            <Step6AfterCare delivery={delivery} onSelectUpsell={selectUpsell} onReset={reset} />
          )}
        </>
      )}
    </div>
  );
}
