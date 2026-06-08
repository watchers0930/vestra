"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ShieldCheck, ChevronLeft, ChevronRight,
  ChevronDown, Menu, X, ExternalLink,
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
import PwaInstallButton from "@/components/layout/PwaInstallButton";
import { useNewMemberBadge } from "@/hooks/useNewMemberBadge";
import {
  type MenuItem, userMenuItems, userMenuGroups, adminMenuItems,
  ACTIVE_STYLE, ITEM_BASE,
} from "./sidebar-menu-data";

interface TooltipState {
  text: string;
  top: number;
  left: number;
}

const APP_VERSION = packageJson.version;

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const userRole = session?.user?.role;
  const isBusiness = userRole === "BUSINESS";
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
  const { count: newMemberCount, markSeen } = useNewMemberBadge(isAdmin);

  useEffect(() => {
    if (isAdminPage && currentTab === "users") {
      markSeen();
    }
  }, [isAdminPage, currentTab, markSeen]);

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

  const renderMenuItem = (item: MenuItem, isActive: boolean, badgeCount?: number) => {
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
          {badgeCount != null && badgeCount > 0 && (
            <span className="bg-red-500 rounded-full text-[9px] text-white" style={{ minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", fontWeight: 700, flexShrink: 0 }}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
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
              {adminMenuItems.map((item) => {
                const badge = item.href === "/admin?tab=users" ? newMemberCount : undefined;
                return renderMenuItem(item, isAdminItemActive(item), badge);
              })}
            </div>
          ) : (
            <>
              {userMenuGroups.map((group, groupIndex) => {
                // 사업성분석은 그룹에서 제외 (BUSINESS일 때 "기업 서비스"에서 별도 표시)
                const filteredItems = group.items.filter((item) => item.href !== "/feasibility");
                if (filteredItems.length === 0) return null;
                return (
                <div key={group.label}>
                  <div style={{ marginBottom: "4px" }}>
                    {showLabel ? (
                      <div style={{ padding: groupIndex === 0 ? "6px 12px 8px" : "18px 12px 8px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.48)" }}>
                        {group.label}
                      </div>
                    ) : (
                      groupIndex > 0 && <div style={{ margin: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {filteredItems.map((item) => renderMenuItem(item, isUserItemActive(item)))}
                    </div>
                  </div>
                  {groupIndex === 0 && session?.user?.role === "REALESTATE" && session?.user?.verifyStatus === "verified" && (
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
                  {groupIndex === 0 && isBusiness && (
                    <div style={{ marginBottom: "4px" }}>
                      {showLabel ? (
                        <div style={{ padding: "18px 12px 8px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.48)" }}>
                          기업 서비스
                        </div>
                      ) : (
                        <div style={{ margin: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {renderMenuItem(userMenuItems[8], isUserItemActive(userMenuItems[8]))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
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
