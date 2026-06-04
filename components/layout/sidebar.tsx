"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Shield, ShieldCheck, FileSearch, Calculator,
  TrendingUp, Home, MessageSquare, Database, ChevronLeft, ChevronRight,
  ChevronDown, Menu, X, Users, CheckCircle, FileText, Megaphone,
  KeyRound, ExternalLink, ClipboardCheck, Brain, SlidersHorizontal,
  ShieldAlert, Key, Newspaper, MapPin, Download, Landmark, Eye,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import packageJson from "../../package.json";
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
interface MenuGroup { label: string; items: MenuItem[]; }
interface TooltipState {
  text: string;
  top: number;
  left: number;
}

const userMenuItems: MenuItem[] = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "대시보드",       description: "보유 자산 현황과 주요 지표를 한눈에 확인합니다" },
  { href: "/rights",         icon: Shield,          label: "권리분석",       description: "등기부등본을 업로드하면 갑구·을구 권리관계를 AI가 종합 분석합니다" },
  { href: "/contract",       icon: FileSearch,      label: "계약검토",       description: "매매·임대차 계약서를 AI가 검토하고 위험 조항을 알려드립니다" },
  { href: "/tax",            icon: Calculator,      label: "세금계산",       description: "취득세·양도세·종부세 등 부동산 세금을 시나리오별로 계산합니다" },
  { href: "/official-price", icon: Landmark,        label: "공시가격 조회",  description: "개별공시지가·공동주택가격·개별주택가격을 통합 조회합니다" },
  { href: "/prediction",     icon: TrendingUp,      label: "시세전망",       description: "실거래가 데이터 기반으로 시세 추이와 향후 전망을 분석합니다" },
  { href: "/price-map",      icon: MapPin,          label: "시세지도",       description: "지도 위에서 아파트별 실거래가와 시세 변동을 한눈에 확인합니다" },
  {
    href: "/jeonse", icon: Home, label: "전세보호", description: "전세 안전 진단부터 전입신고·확정일자까지 보호 절차를 안내합니다",
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
  { href: "/feasibility",    icon: ClipboardCheck,  label: "사업성분석 보고서", description: "다중 문서 기반 SCR 수준 사업성 검증 보고서를 생성합니다" },
  { href: "/assistant",      icon: MessageSquare,   label: "AI 어시스턴트",  description: "부동산 관련 궁금한 점을 AI에게 자유롭게 질문할 수 있습니다" },
  { href: "/expert-connect", icon: Users,           label: "전문가 연결",    description: "AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다" },
  { href: "/monitoring",     icon: Eye,             label: "등기감시",       description: "등기부등본 변동을 실시간 감시하고 무결성 검증 증명서를 발급합니다" },
  { href: "/api-hub",        icon: Database,        label: "API 데이터 허브", description: "국토교통부·법원 등 공공 API 연동 현황과 데이터를 조회합니다" },
  { href: "/agent",          icon: Handshake,       label: "중개관리",       description: "부동산 중개 고객을 관리하고 물건 모니터링을 설정합니다" },
];

const userMenuGroups: MenuGroup[] = [
  { label: "메인",     items: [userMenuItems[0]] },
  { label: "분석 서비스", items: [userMenuItems[1], userMenuItems[2], userMenuItems[5], userMenuItems[7], userMenuItems[11], userMenuItems[6]] },
  { label: "도구",     items: [userMenuItems[9], userMenuItems[10], userMenuItems[3], userMenuItems[4]] },
  { label: "보고서",   items: [userMenuItems[8]] },
];

const adminMenuItems: MenuItem[] = [
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
  { href: "/admin?tab=account",             icon: KeyRound,         label: "계정 설정",     description: "관리자 비밀번호 변경 및 계정 설정을 관리합니다" },
];

// ── 공통 스타일 상수 ──
const ACTIVE_STYLE = {
  background: "linear-gradient(135deg, rgba(0,113,227,0.24) 0%, rgba(41,151,255,0.14) 100%)",
  border: "1px solid rgba(41,151,255,0.22)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
  paddingLeft: "11px",
} as const;

const ITEM_BASE = "flex items-center gap-3.5 rounded-2xl text-sm w-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30";
const APP_VERSION = packageJson.version;

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(() => {
    const parent = userMenuItems.find(
      (item) => item.children && (pathname.startsWith(item.href) || item.children.some((c) => pathname === c.href))
    );
    return parent ? parent.href : null;
  });
  const currentTab = searchParams.get("tab");
  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const showLabel = !collapsed || mobileOpen;
  const sidebarRef = useRef<HTMLElement>(null);
  const hideTooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const clearHideTooltip = useCallback(() => {
    if (hideTooltipTimeout.current) {
      clearTimeout(hideTooltipTimeout.current);
      hideTooltipTimeout.current = null;
    }
  }, []);

  const openTooltip = useCallback((target: HTMLElement, text: string) => {
    if (!text) return;
    clearHideTooltip();
    const rect = target.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    setTooltip({
      text,
      top: rect.top + rect.height / 2,
      left: Math.max(rect.right, sidebarRect?.right ?? rect.right) + 14,
    });
  }, [clearHideTooltip]);

  const openTooltipFromEvent = useCallback((
    e: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
    text: string,
  ) => {
    openTooltip(e.currentTarget, text);
  }, [openTooltip]);

  const queueCloseTooltip = useCallback(() => {
    clearHideTooltip();
    hideTooltipTimeout.current = setTimeout(() => {
      setTooltip(null);
    }, 70);
  }, [clearHideTooltip]);

  useEffect(() => {
    return () => {
      if (hideTooltipTimeout.current) {
        clearTimeout(hideTooltipTimeout.current);
      }
    };
  }, []);

  const isAdminItemActive = useCallback((item: MenuItem) => {
    if (!isAdminPage) return false;
    const itemTab = new URL(item.href, "http://x").searchParams.get("tab");
    return itemTab ? currentTab === itemTab : !currentTab;
  }, [isAdminPage, currentTab]);

  const isUserItemActive = useCallback((item: MenuItem) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }, [pathname]);

  const renderMenuItem = (item: MenuItem, isActive: boolean) => {
    const iconEl = (
      <item.icon size={17} strokeWidth={1.7} style={{ color: isActive ? "#7cc4ff" : "rgba(255,255,255,0.72)", flexShrink: 0, transition: "color 0.2s" }} />
    );
    const tooltipHandlers = {
      onMouseOver: (e: React.MouseEvent<HTMLElement>) => openTooltipFromEvent(e, item.description),
      onMouseMove: (e: React.MouseEvent<HTMLElement>) => openTooltipFromEvent(e, item.description),
      onMouseOut: queueCloseTooltip,
      onPointerEnter: (e: React.PointerEvent<HTMLElement>) => openTooltip(e.currentTarget, item.description),
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => openTooltip(e.currentTarget, item.description),
      onPointerLeave: queueCloseTooltip,
      onFocus: (e: React.FocusEvent<HTMLElement>) => openTooltipFromEvent(e, item.description),
      onBlur: queueCloseTooltip,
    };

    if (item.children) {
      const isOpen = openAccordion === item.href;
      return (
        <div key={item.href} className="relative">
          <button
            onClick={() => setOpenAccordion(isOpen ? null : item.href)}
            {...tooltipHandlers}
            aria-label={item.label} aria-expanded={isOpen} aria-current={isActive ? "page" : undefined}
            style={isActive ? { ...ACTIVE_STYLE, paddingTop: "11px", paddingBottom: "11px" } : { paddingLeft: "12px", paddingTop: "11px", paddingBottom: "11px" }}
            className={cn(ITEM_BASE, "text-left pr-3", isActive ? "text-white font-medium" : "text-white/80 hover:bg-white/[0.06] hover:text-white")}
          >
            {iconEl}
            {showLabel && (
              <>
                <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-0.01em]">{item.label}</div>
                <ChevronDown size={14} style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: isActive ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.44)" }} />
              </>
            )}
          </button>
          {showLabel && (
            <div style={{ overflow: "hidden", maxHeight: isOpen ? "600px" : "0", opacity: isOpen ? 1 : 0, transition: "max-height 0.25s ease, opacity 0.2s" }}>
              <div style={{ marginTop: "4px", paddingBottom: "6px", paddingLeft: "8px" }}>
                {item.children.map((child) => {
                  const isChildActive = pathname === child.href;
                  return (
                    <Link key={child.href} href={child.href} aria-current={isChildActive ? "page" : undefined}
                      style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "36px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", borderRadius: "12px", fontSize: "12.5px", textDecoration: "none", color: isChildActive ? "#ffffff" : "rgba(255,255,255,0.72)", background: isChildActive ? "rgba(255,255,255,0.09)" : "transparent", transition: "all 0.15s", fontWeight: isChildActive ? 600 : 500 }}
                      className={!isChildActive ? "hover:bg-white/[0.05] hover:text-white" : undefined}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: isChildActive ? "#7cc4ff" : "rgba(255,255,255,0.36)", flexShrink: 0 }} />
                      {child.label}
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
      <div key={item.href} className="relative">
        <Link href={item.href}
          {...tooltipHandlers}
          onClick={(e) => openTooltipFromEvent(e, item.description)}
          aria-label={item.label} aria-current={isActive ? "page" : undefined}
          style={isActive ? { ...ACTIVE_STYLE, paddingRight: "12px", paddingTop: "11px", paddingBottom: "11px" } : { paddingLeft: "12px", paddingRight: "12px", paddingTop: "11px", paddingBottom: "11px" }}
          className={cn(ITEM_BASE, isActive ? "text-white font-medium" : "text-white/80 hover:bg-white/[0.06] hover:text-white")}
        >
          {iconEl}
          {showLabel && <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-0.01em]">{item.label}</div>}
        </Link>
      </div>
    );
  };

  return (
    <>
      {/* 모바일 햄버거 */}
      <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar text-white shadow-lg lg:hidden" aria-label="메뉴 열기">
        <Menu size={20} />
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar text-white flex flex-col z-50 transition-all duration-300",
          "max-lg:translate-x-[-100%]",
          mobileOpen && "max-lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-[272px]",
          "w-[260px]"
        )}
      >
        {/* ── 로고 영역 ── */}
        <div className="flex items-center justify-between px-3 border-b border-white/[0.06]" style={{ height: "60px" }}>
          <Link href="/" aria-label="VESTRA 홈" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity overflow-hidden">
            <VestraLogoMark size={30} variant={isAdmin && isAdminPage ? "admin" : "default"} />
            {showLabel && (
              <div style={{ lineHeight: 1 }}>
                <p style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "0.15em", color: "#fff", fontFamily: "var(--font-sora)", margin: 0 }}>
                  VESTRA
                  <span style={{ marginLeft: "6px", fontSize: "8px", fontWeight: 500, color: "rgba(255,255,255,0.5)", verticalAlign: "middle", letterSpacing: "0.05em" }}>v{APP_VERSION}</span>
                </p>
                <p style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.46)", margin: "3px 0 0", letterSpacing: "0.04em" }}>
                  {isAdmin && isAdminPage ? "관리자 모드" : "AI 자산관리 플랫폼"}
                </p>
              </div>
            )}
          </Link>
          <div className="flex items-center gap-0 flex-shrink-0">
            <PushSubscriber />
            <NotificationBell collapsed={collapsed && !mobileOpen} />
            <button onClick={() => setMobileOpen(false)} className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors" aria-label="메뉴 닫기">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── 내비게이션 ── */}
        <nav role="navigation" aria-label="주요 메뉴" className="flex-1 py-3 px-2.5 overflow-y-auto sidebar-scroll">

          {/* 관리자 배지 */}
          {isAdmin && isAdminPage && showLabel && (
            <div style={{ margin: "0 2px 12px", padding: "8px 12px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={11} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#fca5a5", margin: 0 }}>관리자 모드</p>
                  <p style={{ fontSize: "9px", color: "rgba(252,165,165,0.5)", margin: 0 }}>Admin Mode Active</p>
                </div>
              </div>
            </div>
          )}

          {/* 관리자 메뉴 */}
          {isAdmin && isAdminPage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {adminMenuItems.map((item) => renderMenuItem(item, isAdminItemActive(item)))}
            </div>
          ) : (
            <>
              {userMenuGroups.map((group, groupIndex) => (
                <div key={group.label} style={{ marginBottom: "4px" }}>
                  {showLabel ? (
                    <div style={{ padding: groupIndex === 0 ? "6px 12px 8px" : "18px 12px 8px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.48)" }}>
                      {group.label}
                    </div>
                  ) : (
                    groupIndex > 0 && <div style={{ margin: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {group.items.map((item) => renderMenuItem(item, isUserItemActive(item)))}
                  </div>
                </div>
              ))}
              {session?.user?.role === "REALESTATE" && session?.user?.verifyStatus === "verified" && (
                <div style={{ marginBottom: "4px" }}>
                  {showLabel ? (
                    <div style={{ padding: "18px 12px 8px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.48)" }}>
                      중개 서비스
                    </div>
                  ) : (
                    <div style={{ margin: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {renderMenuItem(userMenuItems[userMenuItems.length - 1], isUserItemActive(userMenuItems[userMenuItems.length - 1]))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 관리자 전환 링크 */}
          {isAdmin && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {isAdminPage ? (
                <Link href="/dashboard" aria-label="사용자 사이트"
                  onMouseOver={(e) => openTooltipFromEvent(e, "사용자 화면으로 전환")}
                  onMouseMove={(e) => openTooltipFromEvent(e, "사용자 화면으로 전환")}
                  onMouseOut={queueCloseTooltip}
                  onPointerEnter={(e) => openTooltip(e.currentTarget, "사용자 화면으로 전환")}
                  onPointerMove={(e) => openTooltip(e.currentTarget, "사용자 화면으로 전환")}
                  onPointerLeave={queueCloseTooltip}
                  onFocus={(e) => openTooltipFromEvent(e, "사용자 화면으로 전환")}
                  onBlur={queueCloseTooltip}
                  onClick={(e) => openTooltipFromEvent(e, "사용자 화면으로 전환")}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px", fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "all 0.15s" }}
                  className="hover:bg-white/[0.05] hover:text-white/70"
                >
                  <ExternalLink size={17} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                  {showLabel && <span>사용자 사이트</span>}
                </Link>
              ) : (
                <Link href="/admin" aria-label="관리자"
                  onMouseOver={(e) => openTooltipFromEvent(e, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  onMouseMove={(e) => openTooltipFromEvent(e, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  onMouseOut={queueCloseTooltip}
                  onPointerEnter={(e) => openTooltip(e.currentTarget, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  onPointerMove={(e) => openTooltip(e.currentTarget, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  onPointerLeave={queueCloseTooltip}
                  onFocus={(e) => openTooltipFromEvent(e, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  onBlur={queueCloseTooltip}
                  onClick={(e) => openTooltipFromEvent(e, "서비스 관리, 회원 관리, 분석 이력을 확인합니다")}
                  style={pathname.startsWith("/admin") ? { ...ACTIVE_STYLE, paddingRight: "12px", display: "flex", alignItems: "center", gap: "10px", borderRadius: "10px", fontSize: "13px", textDecoration: "none", color: "#fff" }
                    : { display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px", fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
                  className={cn("transition-all duration-200", !pathname.startsWith("/admin") && "hover:bg-white/[0.05] hover:text-white/70")}
                >
                  <ShieldCheck size={17} strokeWidth={1.6} style={{ flexShrink: 0, color: pathname.startsWith("/admin") ? "#2997ff" : undefined }} />
                  {showLabel && <span>관리자</span>}
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* PWA 설치 */}
        <PwaInstallButton collapsed={collapsed && !mobileOpen} />

        {/* 유저 메뉴 */}
        <UserMenu collapsed={collapsed && !mobileOpen} />

        {/* 접기 토글 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", height: "40px" }}
          className="hidden lg:flex items-center justify-center hover:bg-white/[0.05] transition-colors group"
        >
          <div style={{ width: "22px", height: "22px", borderRadius: "7px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            className="group-hover:bg-white/[0.10]">
            {collapsed ? <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.45)" }} /> : <ChevronLeft size={13} style={{ color: "rgba(255,255,255,0.45)" }} />}
          </div>
        </button>
      </aside>

      {tooltip && typeof document !== "undefined" ? createPortal(
        <div
          className="pointer-events-none fixed"
          style={{
            left: tooltip.left,
            top: tooltip.top,
            transform: "translateY(-50%)",
            zIndex: 2147483647,
          }}
        >
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: -7,
                top: "50%",
                transform: "translateY(-50%)",
                width: 14,
                height: 14,
                background: "rgba(17,24,39,0.98)",
                borderLeft: "1px solid rgba(255,255,255,0.12)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                rotate: "45deg",
                borderBottomLeftRadius: "2px",
              }}
            />
            <div
              style={{
                width: 228,
                borderRadius: "14px",
                background: "linear-gradient(180deg, rgba(24,29,39,0.98) 0%, rgba(12,16,24,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "10px 14px",
                boxShadow: "0 18px 48px rgba(0,0,0,0.42)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }}
            >
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(124,196,255,0.78)", margin: "0 0 6px" }}>
                Menu Guide
              </p>
              <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.88)", lineHeight: 1.55, margin: 0 }}>
                {tooltip.text}
              </p>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

function PwaInstallButton({ collapsed }: { collapsed: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    const prompt = deferredPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") { setInstalled(true); setDeferredPrompt(null); }
  };

  return (
    <button onClick={handleInstall} style={{ margin: "0 10px 8px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "12px", border: "1px solid rgba(0,113,227,0.25)", background: "rgba(0,113,227,0.08)", padding: "8px 12px", fontSize: "12px", fontWeight: 500, color: "#2997ff", cursor: "pointer", transition: "all 0.15s" }}>
      <Download size={14} />
      {!collapsed && <span>앱 설치하기</span>}
    </button>
  );
}
