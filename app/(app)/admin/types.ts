export type Tab =
  | "overview"
  | "statistics"
  | "users"
  | "verifications"
  | "experts"
  | "analyses"
  | "announcements"
  | "ml-training"
  | "weight-tuning"
  | "integrity-audit"
  | "account"
  | "apikey"
  | "news"
  | "guarantee-rules"
  | "loan-rates"
  | "research-journal";

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
  requestedRole?: string | null;
  verifyStatus: string;
  dailyLimit: number;
  businessNumber: string | null;
  companyName: string | null;
  representName: string | null;
  createdAt: string;
}

export interface UserDetailAnalysis {
  id: string;
  type: string;
  typeLabel: string;
  address: string;
  createdAt: string;
}

export interface UserDetailSubscription {
  plan: string;
  status: string;
  price: number;
  startDate: string;
  endDate: string | null;
  canceledAt: string | null;
}

export interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  requestedRole: string | null;
  userType: string | null;
  businessNumber: string | null;
  companyName: string | null;
  representName: string | null;
  verifyStatus: string;
  dailyLimit: number;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: UserDetailSubscription | null;
  _count: {
    analyses: number;
    assets: number;
    monitoredProperties: number;
    ownedListings: number;
  };
  analyses: UserDetailAnalysis[];
}

export interface ExpertItem {
  id: string;
  userId: string;
  category: string;
  name: string | null;
  phone: string | null;
  firmName: string | null;
  bizNo: string | null;
  licenseNo: string | null;
  homepageSlug: string;
  createdAt: string;
  user: { email: string | null; name: string | null; image: string | null; role: string } | null;
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
