import { BusinessWizardShell } from "../BusinessWizardShell";
import { Step1Account } from "../steps/Step1Account";

export const metadata = { title: "사업자 가입 - VESTRA" };

export default function BusinessStep1Page() {
  return (
    <BusinessWizardShell step={1}>
      <Step1Account />
    </BusinessWizardShell>
  );
}
