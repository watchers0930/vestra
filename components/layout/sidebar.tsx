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
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { version } from "../../package.json";
import UserMenu from "@/components/auth/user-menu";
import { VestraLogoMark } from "@/components/common/VestraLogo";

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
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드", description: "자산 현황" },
  { href: "/rights", icon: Shield, label: "권리분석", description: "등기부등본 종합분석" },
  { href: "/contract", icon: FileSearch, label: "계약검토", description: "계약서 AI 분석" },
  { href: "/tax", icon: Calculator, label: "세무 시뮬레이션", description: "세금 계산" },
  { href: "/prediction", icon: TrendingUp, label: "시세전망", description: "시세 분석·전망" },
  {
    href: "/jeonse", icon: Home, label: "전세보호", description: "권리 실행",
    children: [
      { href: "/jeonse", label: "절차 안내" },
      { href: "/jeonse/analysis", label: "전세 안전 분석" },
      { href: "/jeonse/transfer", label: "전입신고" },
      { href: "/jeonse/fixed-date", label: "확정일자" },
      { href: "/jeonse/jeonse-right", label: "전세권설정등기" },
      { href: "/jeonse/lease-registration", label: "임차권등기명령" },
      { href: "/jeonse/lease-report", label: "주택임대차 신고" },
    ],
  },
  { href: "/assistant", icon: MessageSquare, label: "AI 어시스턴트", description: "AI 상담" },
  { href: "/api-hub", icon: Database, label: "API 데이터 허브", description: "데이터 현황" },
];

// ---------------------------------------------------------------------------
// 사용자 메뉴 그룹
// ---------------------------------------------------------------------------
const userMenuGroups: MenuGroup[] = [
  {
    label: "분석 도구",
    items: [userMenuItems[0], userMenuItems[1], userMenuItems[2]],
  },
  {
    label: "시세·보호",
    items: [userMenuItems[3], userMenuItems[4], userMenuItems[5]],
  },
  {
    label: "도구",
    items: [userMenuItems[6], userMenuItems[7]],
  },
];

// ---------------------------------------------------------------------------
// 관리자 메뉴
// ---------------------------------------------------------------------------
const adminMenuItems: MenuItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "개요", description: "관리자 대시보드" },
  { href: "/admin?tab=users", icon: Users, label: "회원 관리", description: "역할·한도·삭제" },
  { href: "/admin?tab=verifications", icon: CheckCircle, label: "인증 관리", description: "승인·거부" },
  { href: "/admin?tab=analyses", icon: FileText, label: "분석 이력", description: "전체 분석 기록" },
  { href: "/admin?tab=announcements", icon: Megaphone, label: "공지사항", description: "공지 관리" },
  { href: "/admin?tab=account", icon: KeyRound, label: "계정 설정", description: "비밀번호 변경" },
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
      (item) => item.children && pathname.startsWith(item.href)
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

  // 관리자 메뉴 활성 상태 체크
  const isAdminItemActive = (item: MenuItem) => {
    if (!isAdminPage) return false;
    const itemUrl = new URL(item.href, "http://x");
    const itemTab = itemUrl.searchParams.get("tab");
    if (!itemTab) return !currentTab; // 개요 탭
    return currentTab === itemTab;
  };

  // 사용자 메뉴 활성 상태 체크
  const isUserItemActive = (item: MenuItem) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

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
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left",
              "transition-[background-color,color,opacity] duration-200 ease-out",
              isActive
                ? "sidebar-active-accent text-white font-medium"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
            )}
            title={!showLabel ? item.label : undefined}
          >
            <item.icon size={20} strokeWidth={1.5} className="flex-shrink-0" />
            {showLabel && (
              <>
                <div className="flex-1">
                  <div>{item.label}</div>
                  {!isActive && (
                    <div className="text-[10px] text-gray-500/70">{item.description}</div>
                  )}
                </div>
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
                isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="mt-1 space-y-0.5">
                {item.children.map((child) => {
                  const isChildActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-lg text-xs",
                        "transition-[background-color,color] duration-200 ease-out",
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
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
          "transition-[background-color,color,opacity] duration-200 ease-out",
          isActive
            ? "sidebar-active-accent text-white font-medium"
            : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
        )}
        title={!showLabel ? item.label : undefined}
      >
        <item.icon size={20} strokeWidth={1.5} className="flex-shrink-0" />
        {showLabel && (
          <div>
            <div>{item.label}</div>
            {!isActive && (
              <div className="text-[10px] text-gray-500/70">{item.description}</div>
            )}
          </div>
        )}
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
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar text-white flex flex-col z-50 transition-all duration-300",
          "max-lg:translate-x-[-100%]",
          mobileOpen && "max-lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-[240px]",
          "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
          <div className="flex items-center gap-2">
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
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.04] transition-colors duration-200"
            aria-label="메뉴 닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto sidebar-scroll">
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
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.04] hover:text-gray-100 transition-[background-color,color] duration-200 ease-out"
                  title={!showLabel ? "사용자 사이트" : undefined}
                >
                  <ExternalLink size={20} className="flex-shrink-0" />
                  {showLabel && (
                    <div>
                      <div>사용자 사이트</div>
                      <div className="text-[10px] text-gray-500/70">메인 사이트 보기</div>
                    </div>
                  )}
                </Link>
              ) : (
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                    "transition-[background-color,color] duration-200 ease-out",
                    pathname.startsWith("/admin")
                      ? "sidebar-active-accent text-white font-medium"
                      : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100"
                  )}
                  title={!showLabel ? "관리자" : undefined}
                >
                  <ShieldCheck size={20} className="flex-shrink-0" />
                  {showLabel && (
                    <div>
                      <div>관리자</div>
                      <div className="text-[10px] text-gray-500/70">대시보드 관리</div>
                    </div>
                  )}
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* User Menu */}
        <UserMenu collapsed={collapsed && !mobileOpen} />

        {/* Collapse toggle (데스크톱 전용) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-white/5 hover:bg-white/[0.04] transition-colors duration-200 group"
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors duration-200">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </div>
        </button>
      </aside>
    </>
  );
}
