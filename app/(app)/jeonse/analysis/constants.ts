export const propertyTypes = [
  { value: "아파트", label: "아파트" },
  { value: "빌라/다세대", label: "빌라/다세대" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "단독주택", label: "단독주택" },
];

export const needsLabel = {
  required: { text: "설정 필수", bg: "bg-red-100", color: "text-red-700" },
  recommended: { text: "설정 권고", bg: "bg-amber-100", color: "text-amber-700" },
  optional: { text: "선택 사항", bg: "bg-emerald-100", color: "text-emerald-700" },
};

export const riskLabel = {
  high: { text: "고위험", bg: "bg-red-100", color: "text-red-700" },
  medium: { text: "중간", bg: "bg-amber-100", color: "text-amber-700" },
  low: { text: "저위험", bg: "bg-emerald-100", color: "text-emerald-700" },
};
