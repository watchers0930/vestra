export interface JeonseFormData {
  propertyAddress: string;
  dongHo?: string; // 집합건물(아파트·빌라/다세대·오피스텔) 동/호수 상세주소
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
