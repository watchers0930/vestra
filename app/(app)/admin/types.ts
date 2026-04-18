export type Tab =
  | "overview"
  | "users"
  | "verifications"
  | "analyses"
  | "announcements"
  | "ml-training"
  | "weight-tuning"
  | "integrity-audit"
  | "account"
  | "apikey"
  | "news"
  | "guarantee-rules"
  | "loan-rates";

export interface Stats {
  totalUsers: number;
  roles: Record<string, number>;
  pendingVerifications: number;
  todayAnalyses: number;
  totalAnalyses: number;
  totalAssets: number;
  dailyTrend: { date: string; count: number }[];
}

export interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  verifyStatus: string;
  dailyLimit: number;
  businessNumber: string | null;
  createdAt: string;
}

export interface AnalysisItem {
  id: string;
  type: string;
  typeLabel: string;
  address: string;
  summary: string;
  createdAt: string;
  user: { name: string | null; email: string };
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmModalState {
  message: string;
  onConfirm: () => void;
}
