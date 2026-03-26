"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  ShieldCheck,
  FileSearch,
  Calculator,
  TrendingUp,
  Home,
  MessageSquare,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Users,
  CheckCircle,
  FileText,
  Megaphone,
  KeyRound,
  ExternalLink,
  ClipboardCheck,
  Brain,
  SlidersHorizontal,
  ShieldAlert,
  Key,
  Newspaper,
  MapPin,
  Banknote,
  Download,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { version } from "../../package.json";
import UserMenu from "@/components/auth/user-menu";
import { VestraLogoMark } from "@/components/common/VestraLogo";
import NotificationBell from "@/components/layout/NotificationBell";
import PushSubscriber from "@/components/pwa/PushSubscriber";

interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  children?: { href: string; label: string }[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// ---------------------------------------------------------------------------
// 일반 사용자 메뉴
// ---------------------------------------------------------------------------
const userMenuItems: MenuItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드", description: "보유 자산 현황과 주요 지표를 한눈에 확인합니다" },
  { href: "/rights", icon: Shield, label: "권리분석", description: "등기부등본을 업로드하면 갑구·을구 권리관계를 AI가 종합 분석합니다" },
  { href: "/contract", icon: FileSearch, label: "계약검토", description: "매매·임대차 계약서를 AI가 검토하고 위험 조항을 알려드립니다" },
  { href: "/tax", icon: Calculator, label: "세무 시뮬레이션", description: "취득세·양도세·종부세 등 부동산 세금을 시나리오별로 계산합니다" },
  { href: "/prediction", icon: TrendingUp, label: "시세전망", description: "실거래가 데이터 기반으로 시세 추이와 향후 전망을 분석합니다" },
  { href: "/price-map", icon: MapPin, label: "시세지도", description: "지도 위에서 아파트별 실거래가와 시세 변동을 한눈에 확인합니다" },
  // {
  //   href: "/loan-check", icon: Banknote, label: "대출 가심사", description: "7대 은행 전세대출 조건을 한번에 비교하고 가능 여부를 확인합니다",
  //   children: [
  //     { href: "/loan-check", label: "대출 가심사" },
  //     { href: "/jeonse/comparison", label: "전세 vs 월세 비교" },
  //     { href: "/jeonse/yield", label: "임대 수익률" },
  //     { href: "/jeonse/moving-cost", label: "이사 비용 계산기" },
  //   ],
  // },
  {
    href: "/jeonse", icon: Home, label: "전세보호", description: "전세 안전 진단부터 전입신고·확정일자까지 보호 절차를 안내합니다",
    children: [
      { href: "/jeonse", label: "절차 안내" },
      { href: "/jeonse/analysis", label: "전세 안전 분석" },
      { href: "/jeonse/transfer", label: "전입신고" },
      { href: "/jeonse/fixed-date", label: "확정일자" },
      { href: "/jeonse/jeonse-right", label: "전세권설정등기" },
      { href: "/jeonse/lease-registration", label: "임차권등기명령" },
      { href: "/jeonse/lease-report", label: "주택임대차 신고" },
      // { href: "/landlord-profile", label: "임대인 프로파일" },
      { href: "/jeonse/checklist", label: "계약 체크리스트" },
      { href: "/jeonse/neighborhood", label: "주변 환경 분석" },
    ],
  },
  { href: "/feasibility", icon: ClipboardCheck, label: "사업성 분석", description: "다중 문서 기반 SCR 수준 사업성 검증 보고서를 생성합니다" },
  {
    href: "/assistant", icon: MessageSquare, label: "AI 어시스턴트", description: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문할 수 있습니다",
    children: [
      { href: "/assistant", label: "AI 상담" },
      // { href: "/assistant/negotiation", label: "AI 협상 코치" },
    ],
  },
  { href: "/api-hub", icon: Database, label: "API 데이터 허브", description: "국토교통부·법원 등 공공 API 연동 현황과 데이터를 조회합니다" },
  { href: "/expert-connect", icon: Users, label: "전문가 상담", description: "AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다" },
  { href: "/ai-trust", icon: ShieldCheck, label: "AI 신뢰도", description: "AI 분석의 정확도와 전문가 일치율을 투명하게 공개합니다" },
];

// ---------------------------------------------------------------------------
// 사용자 메뉴 그룹
// ---------------------------------------------------------------------------
const userMenuGroups: MenuGroup[] = [
  {
    label: "분석 도구",
    items: [userMenuItems[0], userMenuItems[1], userMenuItems[2], userMenuItems[5]],
  },
  {
    label: "시세·보호",
    items: [userMenuItems[3], userMenuItems[4], userMenuItems[6]],
  },
  {
    label: "도구",
    items: [userMenuItems[7], userMenuItems[8], userMenuItems[10], userMenuItems[11]],
  },
];

// ---------------------------------------------------------------------------
// 관리자 메뉴
// ---------------------------------------------------------------------------
const adminMenuItems: MenuItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "개요", description: "서비스 통계, 사용량, 시스템 상태를 한눈에 확인합니다" },
  { href: "/admin?tab=users", icon: Users, label: "회원 관리", description: "회원 목록 조회, 역할 변경, 사용 한도를 관리합니다" },
  { href: "/admin?tab=verifications", icon: CheckCircle, label: "인증 관리", description: "전문가 인증 요청을 검토하고 승인·거부합니다" },
  { href: "/admin?tab=analyses", icon: FileText, label: "분석 이력", description: "전체 사용자의 분석 요청 기록을 조회합니다" },
  { href: "/admin?tab=announcements", icon: Megaphone, label: "공지사항", description: "서비스 공지사항을 작성하고 관리합니다" },
  { href: "/admin?tab=ml-training", icon: Brain, label: "ML 학습관리", description: "ML 학습 데이터를 관리하고 검수합니다" },
  { href: "/admin?tab=weight-tuning", icon: SlidersHorizontal, label: "가중치 튜닝", description: "분석 모델의 가중치를 조정합니다" },
  { href: "/admin?tab=integrity-audit", icon: ShieldAlert, label: "무결성 감사", description: "분석 결과의 무결성을 검증합니다" },
  { href: "/admin?tab=apikey", icon: Key, label: "API KEY", description: "외부 API 키를 관리합니다" },
  { href: "/admin?tab=news", icon: Newspaper, label: "뉴스·정책", description: "부동산 뉴스/정책 수집 현황을 확인합니다" },
  { href: "/admin?tab=guarantee-rules", icon: ShieldCheck, label: "보증보험 규칙", description: "보증보험 가입조건 규칙을 관리합니다" },
  { href: "/admin?tab=account", icon: KeyRound, label: "계정 설정", description: "관리자 비밀번호 변경 및 계정 설정을 관리합니다" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const currentTab = searchParams.get("tab");
  const isAdminPage = pathname.startsWith("/admin");

  // 현재 경로에 맞는 아코디언 자동 펼침
  useEffect(() => {
    const parent = userMenuItems.find(
      (item) =>
        item.children &&
        (pathname.startsWith(item.href) ||
          item.children.some((child) => pathname === child.href))
    );
    setOpenAccordion(parent ? parent.href : null);
  }, [pathname]);

  // 경로 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, currentTab]);

  // 모바일 메뉴 열릴 때 스크롤 방지
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const showLabel = !collapsed || mobileOpen;

  // 툴팁 상태
  const [tooltip, setTooltip] = useState<{ text: string; top: number; left: number } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const showTooltip = useCallback((e: React.MouseEvent, description: string) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    tooltipTimeout.current = setTimeout(() => {
      const sidebarWidth = sidebarRef.current?.getBoundingClientRect().width ?? 240;
      setTooltip({
        text: description,
        top: rect.top + rect.height / 2,
        left: sidebarWidth,
      });
    }, 300);
  }, []);

  const hideTooltip = useCallback(() => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltip(null);
  }, []);

  // 관리자 메뉴 활성 상태 체크
  const isAdminItemActive = useCallback((item: MenuItem) => {
    if (!isAdminPage) return false;
    const itemUrl = new URL(item.href, "http://x");
    const itemTab = itemUrl.searchParams.get("tab");
    if (!itemTab) return !currentTab;
    return currentTab === itemTab;
  }, [isAdminPage, currentTab]);

  // 사용자 메뉴 활성 상태 체크
  const isUserItemActive = useCallback((item: MenuItem) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }, [pathname]);

  // ---------------------------------------------------------------------------
  // 메뉴 아이템 렌더링 (공통)
  // ---------------------------------------------------------------------------
  const renderMenuItem = (item: MenuItem, isActive: boolean) => {
    if (item.children) {
      const isOpen = openAccordion === item.href;
      return (
        <div key={item.href}>
          <button
            onClick={() => setOpenAccordion(isOpen ? null : item.href)}
            onMouseEnter={(e) => showTooltip(e, item.description)}
            onMouseLeave={hideTooltip}
            aria-label={item.label}
            aria-expanded={isOpen}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left",
              "transition-[background-color,color,opacity] duration-200 ease-out",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
              isActive
                ? "sidebar-active-accent text-white font-medium"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
            )}
            title={!showLabel ? item.label : undefined}
          >
            <item.icon size={20} strokeWidth={1.5} className="flex-shrink-0" />
            {showLabel && (
              <>
                <span className="flex-1">{item.label}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "flex-shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>
          {showLabel && (
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="mt-1 space-y-0.5">
                {item.children.map((child) => {
                  const isChildActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      aria-label={child.label}
                      aria-current={isChildActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-lg text-xs",
                        "transition-[background-color,color] duration-200 ease-out",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
                        isChildActive
                          ? "text-white font-medium"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                      )}
                    >
                      {isChildActive && (
                        <div className="w-1 h-1 rounded-full bg-sidebar-accent flex-shrink-0" />
                      )}
                      <span>{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onMouseEnter={(e) => showTooltip(e, item.description)}
        onMouseLeave={hideTooltip}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
          "transition-[background-color,color,opacity] duration-200 ease-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
          isActive
            ? "sidebar-active-accent text-white font-medium"
            : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
        )}
        title={!showLabel ? item.label : undefined}
      >
        <item.icon size={20} strokeWidth={1.5} className="flex-shrink-0" />
        {showLabel && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-white shadow-lg lg:hidden"
        aria-label="메뉴 열기"
      >
        <Menu size={20} />
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar text-white flex flex-col z-50 transition-all duration-300",
          "max-lg:translate-x-[-100%]",
          mobileOpen && "max-lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-[240px]",
          "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-white/5 overflow-hidden">
          <Link href="/" aria-label="VESTRA 홈" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <VestraLogoMark
              size={32}
              variant={isAdmin && isAdminPage ? "admin" : "default"}
            />
            {showLabel && (
              <div>
                <h1 className="text-lg font-bold tracking-widest" style={{ fontFamily: 'var(--font-sora)' }}>
                  VESTRA
                  <span className="ml-1.5 text-[9px] font-normal text-white/40 align-middle">v{version}</span>
                </h1>
                <p className="text-[10px] text-muted -mt-1">
                  {isAdmin && isAdminPage ? "관리자 모드" : "AI 자산관리 플랫폼"}
                </p>
              </div>
            )}
          </Link>
          <div className="flex items-center gap-0">
            <PushSubscriber />
            <NotificationBell collapsed={collapsed && !mobileOpen} />
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.04] transition-colors duration-200"
              aria-label="메뉴 닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav role="navigation" aria-label="주요 메뉴" className="flex-1 py-3 px-2.5 overflow-y-auto sidebar-scroll">
          {/* 관리자 모드 배지 */}
          {isAdmin && isAdminPage && showLabel && (
            <div className="mx-0.5 mb-4 px-3 py-2.5 rounded-xl frosted-glass">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-red-500/15 flex items-center justify-center">
                  <ShieldCheck size={12} className="text-red-400" />
                </div>
                <div>
                  <span className="text-xs font-medium text-red-300">관리자 모드</span>
                  <span className="block text-[9px] text-red-400/60">Admin Mode Active</span>
                </div>
              </div>
            </div>
          )}

          {/* 관리자 메뉴 렌더링 (그룹 없이) */}
          {isAdmin && isAdminPage ? (
            <div className="space-y-0.5">
              {adminMenuItems.map((item) => renderMenuItem(item, isAdminItemActive(item)))}
            </div>
          ) : (
            /* 사용자 메뉴 그룹별 렌더링 */
            userMenuGroups.map((group, groupIndex) => (
              <div key={group.label}>
                {/* 그룹 헤더 */}
                {showLabel ? (
                  <div className={cn(
                    "px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-group",
                    groupIndex === 0 ? "pt-1" : "pt-4"
                  )}>
                    {group.label}
                  </div>
                ) : (
                  groupIndex > 0 && (
                    <div className="mx-3 my-2 border-t border-white/5" />
                  )
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => renderMenuItem(item, isUserItemActive(item)))}
                </div>
              </div>
            ))
          )}

          {/* 관리자: 사용자 사이트 바로가기 / 일반: 관리자 메뉴 */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-white/5">
              {isAdminPage ? (
                <Link
                  href="/dashboard"
                  onMouseEnter={(e) => showTooltip(e, "사용자 화면으로 전환하여 서비스를 확인합니다")}
                  onMouseLeave={hideTooltip}
                  aria-label="사용자 사이트"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.04] hover:text-gray-100 transition-[background-color,color] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  title={!showLabel ? "사용자 사이트" : undefined}
                >
                  <ExternalLink size={20} className="flex-shrink-0" />
                  {showLabel && <span>사용자 사이트</span>}
                </Link>
              ) : (
                <Link
                  href="/admin"
                  onMouseEnter={(e) => showTooltip(e, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  onMouseLeave={hideTooltip}
                  aria-label="관리자"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                    "transition-[background-color,color] duration-200 ease-out",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
                    pathname.startsWith("/admin")
                      ? "sidebar-active-accent text-white font-medium"
                      : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
                  )}
                  title={!showLabel ? "관리자" : undefined}
                >
                  <ShieldCheck size={20} className="flex-shrink-0" />
                  {showLabel && <span>관리자</span>}
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* PWA 설치 버튼 */}
        <PwaInstallButton collapsed={collapsed && !mobileOpen} />

        {/* User Menu */}
        <UserMenu collapsed={collapsed && !mobileOpen} />

        {/* Collapse toggle (데스크톱 전용) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className="hidden lg:flex items-center justify-center h-10 border-t border-white/5 hover:bg-white/[0.04] transition-colors duration-200 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors duration-200">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </div>
        </button>

      </aside>

      {/* 말풍선 툴팁 - aside 바깥에 fixed로 렌더링 */}
      {tooltip && (
        <div
          className="fixed pointer-events-none z-[60]"
          style={{
            left: tooltip.left,
            top: tooltip.top,
            transform: "translateY(-50%)",
          }}
        >
          <div className="ml-3 relative">
            {/* 꼬리 (삼각형) */}
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#1e1e24]" />
            {/* 말풍선 본체 */}
            <div className="bg-[#1e1e24] border border-white/10 rounded-xl px-4 py-2.5 shadow-xl w-[220px]">
              <p className="text-[12px] leading-relaxed text-gray-200">{tooltip.text}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── PWA 설치 버튼 (사이드바 내장) ──
function PwaInstallButton({ collapsed }: { collapsed: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    const prompt = deferredPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <button
      onClick={handleInstall}
      className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
    >
      <Download size={14} />
      {!collapsed && <span>앱 설치하기</span>}
    </button>
  );
}
