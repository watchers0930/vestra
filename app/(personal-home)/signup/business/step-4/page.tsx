import { Suspense } from "react";
import { BusinessWizardShell } from "../BusinessWizardShell";
import { Step4Payment } from "../steps/Step4Payment";

export const metadata = { title: "결제 - VESTRA" };

export default function BusinessStep4Page() {
  return (
    <BusinessWizardShell step={4}>
      {/* Step4Payment은 useSearchParams를 사용하므로 Suspense 경계로 감싼다(Next 요구). */}
      <Suspense fallback={<div className="py-10 text-center text-sm text-[#8e8e93]">불러오는 중…</div>}>
        <Step4Payment />
      </Suspense>
    </BusinessWizardShell>
  );
}
