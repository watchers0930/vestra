import { BusinessWizardShell } from "../BusinessWizardShell";
import { Step2Verify } from "../steps/Step2Verify";

export const metadata = { title: "사업자 인증 - VESTRA" };

export default function BusinessStep2Page() {
  return (
    <BusinessWizardShell step={2}>
      <Step2Verify />
    </BusinessWizardShell>
  );
}
