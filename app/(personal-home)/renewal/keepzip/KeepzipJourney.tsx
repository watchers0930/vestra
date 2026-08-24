"use client";

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

/** 서버 사건 상태 → 발송 추적 표시값 */
function deliveryOf(status: string): Delivery {
  if (status === "delivered") return "delivered";
  if (status === "returned") return "returned";
  return "sending";
}

/** 집키퍼 임차인 단일 여정 컨테이너 — 작성 → 검토·결제 → 발송·사후관리. */
export function KeepzipJourney({ lawyerName, lawyerId }: Props) {
  const { showToast } = useToast();
  const j = useKeepzipJourney({ lawyerName, lawyerId, onError: (m) => showToast(m, "error") });
  const delivery = deliveryOf(j.caseStatus);

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
            approved={j.caseStatus === "lawyer_approved"}
            onApprove={() => j.demoAdvance("approve")}
          />
          {j.caseStatus === "lawyer_approved" && (
            <Step4Payment
              onPaid={async () => {
                const r = await j.demoAdvance("pay");
                if (r) {
                  j.goView("track");
                  showToast("결제 완료 — 우체국 등기로 발송되었습니다.", "success");
                }
              }}
            />
          )}
        </>
      )}

      {j.view === "track" && (
        <>
          <Step5Tracking
            delivery={delivery}
            trackingNo={j.trackingNo ?? "-"}
            busy={j.submitting}
            onDeliver={() => j.demoAdvance("deliver")}
            onReturn={() => j.demoAdvance("return")}
          />
          {delivery !== "sending" && (
            <Step6AfterCare delivery={delivery} onSelectUpsell={selectUpsell} onReset={reset} />
          )}
        </>
      )}
    </div>
  );
}
