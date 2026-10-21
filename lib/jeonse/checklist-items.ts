export const CHECKLIST_SCHEMA_VERSION = 1;
export const CHECKLIST_TOTAL = 15;
export interface ChecklistItemDef { id: number; group: string; label: string; }
export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { id: 0, group: "계약 전 확인", label: "등기부등본 열람 및 AI 분석 완료" },
  { id: 1, group: "계약 전 확인", label: "전세가율 80% 이하 확인" },
  { id: 2, group: "계약 전 확인", label: "임대인 신원 및 소유권 확인" },
  { id: 3, group: "계약 전 확인", label: "공인중개사 자격증 및 사무소 확인" },
  { id: 4, group: "계약 전 확인", label: "건축물대장 위반건축물 여부 확인" },
  { id: 5, group: "계약 시 확인", label: "계약서에 특약사항 명시" },
  { id: 6, group: "계약 시 확인", label: "보증금 지급 계좌 = 임대인 계좌 확인" },
  { id: 7, group: "계약 시 확인", label: "계약서 원본 수령 및 서명 확인" },
  { id: 8, group: "계약 시 확인", label: "잔금 당일 오전 등기부 재열람" },
  { id: 9, group: "입주 후 즉시", label: "전입신고 완료" },
  { id: 10, group: "입주 후 즉시", label: "확정일자 취득" },
  { id: 11, group: "입주 후 즉시", label: "주택임대차신고 완료 (해당 시)" },
  { id: 12, group: "보험 · 등기", label: "전세보증보험 가입 신청" },
  { id: 13, group: "보험 · 등기", label: "보증보험 가입증서 수령 및 보관" },
  { id: 14, group: "보험 · 등기", label: "등기부등본 변동 모니터링 설정" },
];
export interface JeonseChecklistDTO {
  address: string; schemaVersion: number; revision: number;
  state: Record<string, boolean>; updatedAt: string | null;
}
