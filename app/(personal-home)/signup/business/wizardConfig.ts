/** 사업자 4단계 위저드 라우트 설정(설계 §4.2). 각 단계는 분리 라우트다. */
import type { WizardStep } from "@/app/(personal-home)/renewal/pricing/hooks/useBusinessWizard";

export const WIZARD_BASE = "/signup/business";

export function stepPath(step: WizardStep): string {
  return `${WIZARD_BASE}/step-${step}`;
}
