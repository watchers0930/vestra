export const ROLE_LABELS: Record<string, string> = {
  GUEST: "게스트",
  PERSONAL: "개인",
  RENTAL_BIZ: "임대사업자",
  BUSINESS: "기업",
  REALESTATE: "부동산",
  LAWYER: "변호사",
  ADMIN: "관리자",
};

export const ROLE_COLORS: Record<string, string> = {
  GUEST: "neutral",
  PERSONAL: "info",
  RENTAL_BIZ: "warning",
  BUSINESS: "primary",
  REALESTATE: "success",
  LAWYER: "primary",
  ADMIN: "danger",
};

/** 전문가 분야(LawyerPartner.category) 라벨 */
export const EXPERT_CATEGORY_LABELS: Record<string, string> = {
  lawyer: "변호사",
  judicial: "법무사",
  tax: "세무사",
  accountant: "회계사",
  appraiser: "감정평가사",
};

export const VERIFY_LABELS: Record<string, string> = {
  none: "미신청",
  pending: "대기",
  verified: "승인",
  rejected: "거부",
};

export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  rights: "권리분석",
  contract: "계약서 분석",
  prediction: "시세전망",
  jeonse: "전세분석",
  registry: "등기부등본",
  unified: "통합분석",
};
