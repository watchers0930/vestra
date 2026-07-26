export type ChecklistItem = {
  id: string;
  label: string;
};

export type ChecklistStep = {
  stepNumber: 1 | 2 | 3;
  stepLabel: string;
  items: ChecklistItem[];
};

export type ChecklistState = Record<string, boolean>;

export const EMERGENCY_CHANGE_TYPES: string[] = [
  "mortgage_added",
  "seizure_added",
  "ownership_changed",
  "lien_added",
  "provisional_registration",
];

export function isEmergencyAlert(changeType: string, riskLevel: string): boolean {
  return (
    (riskLevel === "critical" || riskLevel === "high") &&
    EMERGENCY_CHANGE_TYPES.includes(changeType)
  );
}

export const VICTIM_SUPPORT_PORTAL_URL = "https://jeonse.go.kr";

export const EMERGENCY_CHECKLIST: ChecklistStep[] = [
  {
    stepNumber: 1,
    stepLabel: "즉시 확인",
    items: [
      { id: "step1_1", label: "최신 등기부등본 발급 (대법원 인터넷등기소 또는 무인발급기)" },
      { id: "step1_2", label: "임대차계약서·확정일자 원본 위치 확인" },
      { id: "step1_3", label: "전입신고 여부 및 날짜 재확인" },
    ],
  },
  {
    stepNumber: 2,
    stepLabel: "보증금 보호 조치",
    items: [
      { id: "step2_1", label: "임차권등기명령 신청 검토 (법원)" },
      { id: "step2_2", label: "전세보증보험 가입 여부 확인 (HUG / SGI서울보증)" },
      { id: "step2_3", label: "임대인에게 서면 통보 및 내용증명 발송 여부 결정" },
    ],
  },
  {
    stepNumber: 3,
    stepLabel: "전문가 상담",
    items: [
      { id: "step3_1", label: "법무사 또는 변호사 상담 예약" },
      { id: "step3_2", label: "전세사기피해지원센터 상담 신청" },
      { id: "step3_3", label: "주택도시보증공사(HUG) 피해 접수 검토" },
    ],
  },
];
