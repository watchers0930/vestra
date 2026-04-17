export interface RealTransaction {
  dealAmount: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
  floor: number;
  dong: string;
}

export interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface ModelResult {
  modelName: string;
  prediction: { "1y": number; "5y": number; "10y": number };
  r2: number;
  weight: number;
}

export interface EnsemblePredictionResult {
  models: ModelResult[];
  ensemble: { "1y": number; "5y": number; "10y": number };
  dominantModel: string;
  modelAgreement: number;
}

export interface PredictionResult {
  currentPrice: number;
  predictions: {
    optimistic: { "1y": number; "5y": number; "10y": number };
    base: { "1y": number; "5y": number; "10y": number };
    pessimistic: { "1y": number; "5y": number; "10y": number };
  };
  variables: string[];
  factors: PredictionFactor[];
  confidence: number;
  aiOpinion: string;
  realTransactions: RealTransaction[];
  priceStats: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    transactionCount: number;
    period: string;
  } | null;
  ensemble?: EnsemblePredictionResult;
  monthlyForecast?: import("@/lib/prediction-engine").MonthlyPrediction[];
  macroFactors?: import("@/lib/prediction-engine").MacroEconomicFactors;
  backtestResult?: import("@/lib/prediction-engine").BacktestResult;
  marketCycle?: import("@/lib/prediction-engine").MarketCycleInfo;
  integrity?: {
    merkleRoot: string;
    totalSteps: number;
    isValid: boolean;
    stages: { name: string; hash: string }[];
  };
}

export type AddressTab = "admin" | "jibun" | "road";

export interface AddressInfo {
  admin: string;
  jibun: string;
  road: string;
  zipCode: string;
}

export interface DaumPostcodeData {
  zonecode: string;
  address: string;
  addressEnglish: string;
  addressType: string;
  userSelectedType: string;
  jibunAddress: string;
  roadAddress: string;
  bname: string;
  buildingName: string;
  apartment: string;
  sido: string;
  sigungu: string;
  bname1: string;
  bname2: string;
  roadname: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string;
        height?: string;
      }) => { open: () => void; embed: (el: HTMLElement) => void };
    };
  }
}
