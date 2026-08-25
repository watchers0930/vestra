export interface JeonseFormData {
  propertyAddress: string;
  dongHo?: string; // (레거시) 집합건물 동/호수 상세주소 — renewal은 dong/ho 분리 입력
  dong?: string; // 동 (예: 108동)
  ho?: string; // 호수 (예: 1403호)
  deposit: number;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  propertyType: string;
  propertyPrice: number;
  seniorLiens: number;
  isMetro: boolean;
  hasJeonseLoan: boolean;
}

export interface JeonseAnalysis {
  needsRegistration: "required" | "recommended" | "optional";
  reason: string;
  riskLevel: "high" | "medium" | "low";
  recommendations: string[];
  requiredDocuments: { name: string; where: string; note: string }[];
  aiOpinion: string;
}

export interface GeneratedDocument {
  title: string;
  content: string;
}
