import { Crown, Home, Building2, User, CheckCircle2, Clock, XCircle, LayoutDashboard, FileText, ScrollText, Bell, type LucideIcon } from "lucide-react";

export const ROLE_INFO: Record<string, { label: string; color: string; limit: number; icon: typeof Crown; features: string[] }> = {
  ADMIN: { label: "관리자", color: "bg-red-500", limit: 9999, icon: Crown, features: ["전체 기능", "관리자 패널"] },
  REALESTATE: { label: "부동산", color: "bg-emerald-500", limit: 100, icon: Home, features: ["전체 기능", "리포트 다운로드", "포트폴리오 관리", "일 100회"] },
  BUSINESS: { label: "기업", color: "bg-blue-500", limit: 50, icon: Building2, features: ["전체 기능", "리포트 다운로드", "일 50회"] },
  RENTAL_BIZ: { label: "임대사업자", color: "bg-teal-500", limit: 50, icon: Building2, features: ["전체 기능", "매물 등록·관리", "일 50회"] },
  PERSONAL: { label: "개인", color: "bg-[#6e6e73]", limit: 5, icon: User, features: ["전체 기능", "일 5회"] },
  GUEST: { label: "게스트", color: "bg-[#6e6e73]", limit: 2, icon: User, features: ["권리분석만", "일 2회"] },
};

export const VERIFY_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  none: { label: "미인증", icon: XCircle, color: "text-[#6e6e73]" },
  pending: { label: "심사 중", icon: Clock, color: "text-amber-500" },
  verified: { label: "인증 완료", icon: CheckCircle2, color: "text-emerald-500" },
  rejected: { label: "반려", icon: XCircle, color: "text-red-500" },
};

export type ProfileTab = "dashboard" | "listings" | "applications" | "keepzip" | "info" | "tier" | "notif";

export const PROFILE_TABS: { key: ProfileTab; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "대시보드", desc: "내 활동과 자산 현황을 한눈에 확인하세요.", icon: LayoutDashboard },
  { key: "listings", label: "내 매물", desc: "등록한 매물을 관리하세요.", icon: Building2 },
  { key: "applications", label: "의향서", desc: "보낸·받은 임대차 의향서를 관리하세요.", icon: FileText },
  { key: "keepzip", label: "내용증명", desc: "변호사에게 요청한 내용증명의 내용과 진행상황을 확인하세요.", icon: ScrollText },
  { key: "info", label: "내 정보", desc: "회원 정보와 이용 가능 기능을 확인하세요.", icon: User },
  { key: "tier", label: "등급·구독", desc: "회원 등급을 올리고 더 많은 기능을 이용하세요.", icon: Crown },
  { key: "notif", label: "알림 설정", desc: "채널별 알림 수신을 관리하세요.", icon: Bell },
];
