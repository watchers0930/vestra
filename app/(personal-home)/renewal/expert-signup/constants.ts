/** 전문가 가입 — 분야 정의 (분야별 자격 라벨) */

export type ExpertFieldKey = "lawyer" | "judicial" | "tax" | "accountant" | "appraiser";

export interface ExpertFieldDef {
  key: ExpertFieldKey;
  label: string;
  /** 분야별 자격 등록번호 라벨 */
  licenseLabel: string;
  licensePlaceholder: string;
  /** 소속 라벨 */
  officeLabel: string;
}

export const EXPERT_FIELDS: ExpertFieldDef[] = [
  { key: "lawyer", label: "변호사", licenseLabel: "변호사 등록번호", licensePlaceholder: "예) 제12345호", officeLabel: "소속 법무법인 / 사무소" },
  { key: "judicial", label: "법무사", licenseLabel: "법무사 등록번호", licensePlaceholder: "예) 제12345호", officeLabel: "소속 법무사 사무소" },
  { key: "tax", label: "세무사", licenseLabel: "세무사 등록번호", licensePlaceholder: "예) 제12345호", officeLabel: "소속 세무법인 / 사무소" },
  { key: "accountant", label: "회계사", licenseLabel: "공인회계사 등록번호", licensePlaceholder: "예) 제12345호", officeLabel: "소속 회계법인 / 사무소" },
  { key: "appraiser", label: "감정평가사", licenseLabel: "감정평가사 등록번호", licensePlaceholder: "예) 제12345호", officeLabel: "소속 감정평가법인 / 사무소" },
];
