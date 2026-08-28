"use client";

import { useRouter } from "next/navigation";
import s from "./keepzip-renewal.module.css";
import { useToast } from "@/components/common/toast";
import { useKeepzipJourney } from "./hooks/useKeepzipJourney";
import { StepIndicator } from "./components/StepIndicator";
import { Step1Input } from "./components/Step1Input";
import { Step2Draft } from "./components/Step2Draft";
import { Step4Payment } from "./components/Step4Payment";

interface Props {
  lawyerName?: string;
  lawyerId?: string;
}

/** 집키퍼 임차인 여정 — 작성 → 결제·제출. 제출 완료 후 진행상황은 마이페이지에서 확인. */
export function KeepzipJourney({ lawyerName, lawyerId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const j = useKeepzipJourney({ lawyerName, lawyerId, onError: (m) => showToast(m, "error") });

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
            onProceed={j.goToPayment}
            onError={(m) => showToast(m, "error")}
          />
        </div>
      )}

      {j.view === "review" && (
        /* 선결제: 결제 완료 → 담당 변호사에게 전송 → 마이페이지에서 진행 확인 */
        <Step4Payment
          onPaid={async () => {
            const ok = await j.payAndSubmit();
            if (ok) {
              showToast("결제 완료 — 담당 변호사에게 전송되었습니다. 진행 상황은 마이페이지에서 확인하세요.", "success");
              router.push("/profile");
            }
          }}
        />
      )}
    </div>
  );
}
