import type { Expert } from "@/components/expert/ExpertCard";

export const EXPERTS: Expert[] = [
  {
    id: "e1",
    name: "김○○",
    category: "공인중개사",
    specialties: ["전세 안전 검증", "시세 분석", "임대차 분쟁"],
    experience: 12,
    rating: 4.9,
    reviewCount: 247,
    consultFee: 50000,
    available: true,
  },
  {
    id: "e2",
    name: "이○○",
    category: "법무사",
    specialties: ["등기부 해석", "권리분석", "소유권 이전"],
    experience: 15,
    rating: 4.8,
    reviewCount: 189,
    consultFee: 80000,
    available: true,
  },
  {
    id: "e3",
    name: "박○○",
    category: "세무사",
    specialties: ["양도소득세", "취득세", "종합부동산세"],
    experience: 10,
    rating: 4.7,
    reviewCount: 156,
    consultFee: 70000,
    available: true,
  },
  {
    id: "e4",
    name: "최○○",
    category: "변호사",
    specialties: ["계약서 검토", "임대차 분쟁", "부동산 소송"],
    experience: 8,
    rating: 4.9,
    reviewCount: 132,
    consultFee: 100000,
    available: true,
  },
  {
    id: "e5",
    name: "정○○",
    category: "감정평가사",
    specialties: ["시세 감정", "담보 평가", "재개발 감정"],
    experience: 14,
    rating: 4.6,
    reviewCount: 98,
    consultFee: 90000,
    available: false,
  },
  {
    id: "e6",
    name: "한○○",
    category: "공인중개사",
    specialties: ["전세보호", "확정일자", "전입신고 절차"],
    experience: 9,
    rating: 4.8,
    reviewCount: 211,
    consultFee: 40000,
    available: true,
  },
];

export const CONSULT_TYPES = [
  "전세 안전 검증",
  "등기부 해석",
  "세금 상담",
  "계약서 검토",
];

export const PRICING = [
  { label: "법무사 상담", price: "50,000", icon: "📜" },
  { label: "세무사 상담", price: "80,000", icon: "📊" },
  { label: "공인중개사 상담", price: "30,000", icon: "🏠" },
  { label: "종합 컨설팅", price: "150,000", icon: "💼", highlight: true },
];

export const RESERVATION_TYPES = [
  "법무사 상담",
  "세무사 상담",
  "공인중개사 상담",
  "종합 컨설팅",
];
