import {
  LayoutDashboard, Shield, ShieldCheck, FileSearch, Calculator,
  TrendingUp, Home, MessageSquare, Database,
  Users, CheckCircle, FileText, Megaphone,
  KeyRound, ClipboardCheck, Brain, SlidersHorizontal,
  ShieldAlert, Key, Newspaper, MapPin, Landmark, Eye,
  Handshake, BookOpenText, Building2, ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type AccessTier = "OPEN" | "TRIAL" | "AUTH_REQUIRED";

export interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  tier?: AccessTier;
  children?: { href: string; label: string }[];
}

export interface MenuGroup { label: string; items: MenuItem[]; }

export const userMenuItems: MenuItem[] = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "대시보드",       description: "보유 자산 현황과 주요 지표를 한눈에 확인합니다", tier: "AUTH_REQUIRED" },
  { href: "/rights",         icon: Shield,          label: "권리분석",       description: "등기부등본을 업로드하면 갑구·을구 권리관계를 AI가 종합 분석합니다", tier: "TRIAL" },
  { href: "/monitoring",     icon: Eye,             label: "등기감시",       description: "등기부등본 변동을 실시간 감시하고 무결성 검증 증명서를 발급합니다", tier: "AUTH_REQUIRED" },
  { href: "/contract",       icon: FileSearch,      label: "계약검토",       description: "매매·임대차 계약서를 AI가 검토하고 위험 조항을 알려드립니다", tier: "AUTH_REQUIRED" },
  { href: "/tax",            icon: Calculator,      label: "세금계산",       description: "취득세·양도세·종부세 등 부동산 세금을 시나리오별로 계산합니다", tier: "OPEN" },
  { href: "/official-price", icon: Landmark,        label: "공시가격 조회",  description: "개별공시지가·공동주택가격·개별주택가격을 통합 조회합니다", tier: "OPEN" },
  { href: "/prediction",     icon: TrendingUp,      label: "시세전망",       description: "실거래가 데이터 기반으로 시세 추이와 향후 전망을 분석합니다", tier: "TRIAL" },
  { href: "/price-map",      icon: MapPin,          label: "시세지도",       description: "지도 위에서 아파트별 실거래가와 시세 변동을 한눈에 확인합니다", tier: "OPEN" },
  {
    href: "/jeonse", icon: Home, label: "전세보호", description: "전세 안전 진단부터 전입신고·확정일자까지 보호 절차를 안내합니다", tier: "TRIAL",
    children: [
      { href: "/jeonse",                    label: "절차 안내" },
      { href: "/jeonse/analysis",           label: "전세 안전 분석" },
      { href: "/jeonse/transfer",           label: "전입신고" },
      { href: "/jeonse/fixed-date",         label: "확정일자" },
      { href: "/jeonse/jeonse-right",       label: "전세권설정등기" },
      { href: "/jeonse/lease-registration", label: "임차권등기명령" },
      { href: "/jeonse/lease-report",       label: "주택임대차 신고" },
      { href: "/jeonse/checklist",          label: "계약 체크리스트" },
      { href: "/neighborhood",              label: "주변 환경 분석" },
    ],
  },
  { href: "/feasibility",    icon: ClipboardCheck,  label: "사업성분석 보고서", description: "다중 문서 기반 SCR 수준 사업성 검증 보고서를 생성합니다", tier: "AUTH_REQUIRED" },
  { href: "/assistant",      icon: MessageSquare,   label: "AI 어시스턴트",  description: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문할 수 있습니다", tier: "AUTH_REQUIRED" },
  { href: "/expert-connect", icon: Users,           label: "전문가 연결",    description: "AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다", tier: "AUTH_REQUIRED" },
  { href: "/api-hub",        icon: Database,        label: "API 데이터 허브", description: "국토교통부·법원 등 공공 API 연동 현황과 데이터를 조회합니다", tier: "AUTH_REQUIRED" },
  { href: "/agent",          icon: Handshake,       label: "중개관리",       description: "부동산 중개 고객을 관리하고 물건 모니터링을 설정합니다", tier: "AUTH_REQUIRED" },
  {
    href: "/listings", icon: Building2, label: "매물 거래", description: "매물을 등록하고 계약의향서를 관리합니다", tier: "AUTH_REQUIRED",
    children: [
      { href: "/listings",          label: "매물 목록" },
      { href: "/listings/new",      label: "매물 등록" },
      { href: "/listings/my",       label: "내 매물 관리" },
      { href: "/applications",      label: "받은 의향서" },
      { href: "/applications/my",   label: "보낸 의향서" },
    ],
  },
];

export const userMenuGroups: MenuGroup[] = [
  { label: "메인",       items: [userMenuItems[0]] },
  { label: "분석 서비스", items: [userMenuItems[1], userMenuItems[2], userMenuItems[3], userMenuItems[6], userMenuItems[8], userMenuItems[7], userMenuItems[9]] },
  { label: "도구",       items: [userMenuItems[10], userMenuItems[11], userMenuItems[4], userMenuItems[5]] },
  { label: "매물 거래",   items: [userMenuItems[12]] },
];

export const adminMenuItems: MenuItem[] = [
  { href: "/admin",                         icon: LayoutDashboard,  label: "개요",         description: "서비스 통계, 사용량, 시스템 상태를 한눈에 확인합니다" },
  { href: "/admin?tab=users",               icon: Users,            label: "회원 관리",     description: "회원 목록 조회, 역할 변경, 사용 한도를 관리합니다" },
  { href: "/admin?tab=verifications",       icon: CheckCircle,      label: "인증 관리",     description: "전문가 인증 요청을 검토하고 승인·거부합니다" },
  { href: "/admin?tab=analyses",            icon: FileText,         label: "분석 이력",     description: "전체 사용자의 분석 요청 기록을 조회합니다" },
  { href: "/admin?tab=announcements",       icon: Megaphone,        label: "공지사항",      description: "서비스 공지사항을 작성하고 관리합니다" },
  { href: "/admin?tab=ml-training",         icon: Brain,            label: "ML 학습관리",   description: "ML 학습 데이터를 관리하고 검수합니다" },
  { href: "/admin?tab=weight-tuning",       icon: SlidersHorizontal,label: "가중치 튜닝",   description: "분석 모델의 가중치를 조정합니다" },
  { href: "/admin?tab=integrity-audit",     icon: ShieldAlert,      label: "무결성 감사",   description: "분석 결과의 무결성을 검증합니다" },
  { href: "/admin?tab=apikey",              icon: Key,              label: "API KEY",      description: "외부 API 키를 관리합니다" },
  { href: "/admin?tab=news",                icon: Newspaper,        label: "뉴스·정책",     description: "부동산 뉴스/정책 수집 현황을 확인합니다" },
  { href: "/admin?tab=guarantee-rules",     icon: ShieldCheck,      label: "보증보험 규칙", description: "보증보험 가입조건 규칙을 관리합니다" },
  { href: "/admin?tab=research-journal",    icon: BookOpenText,     label: "연구일지",      description: "Git 변경이력 기반 연구개발 일지를 저장하고 출력합니다" },
  { href: "/admin?tab=account",             icon: KeyRound,         label: "계정 설정",     description: "관리자 비밀번호 변경 및 계정 설정을 관리합니다" },
];

export const ACTIVE_STYLE = {
  background: "linear-gradient(135deg, rgba(0,113,227,0.24) 0%, rgba(41,151,255,0.14) 100%)",
  border: "1px solid rgba(41,151,255,0.22)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
  paddingLeft: "11px",
} as const;

export const ITEM_BASE = "flex items-center gap-3.5 rounded-2xl text-sm w-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30";
