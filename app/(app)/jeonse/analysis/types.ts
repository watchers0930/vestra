export interface JeonseFormData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
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
