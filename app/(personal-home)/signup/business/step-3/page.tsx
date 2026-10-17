import { BusinessWizardShell } from "../BusinessWizardShell";
import { Step3PlanSelect } from "../steps/Step3PlanSelect";

export const metadata = { title: "플랜 선택 - VESTRA" };

export default function BusinessStep3Page() {
  return (
    <BusinessWizardShell step={3}>
      <Step3PlanSelect />
    </BusinessWizardShell>
  );
}
