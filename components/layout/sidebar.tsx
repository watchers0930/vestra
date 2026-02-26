"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  FileSearch,
  Calculator,
  TrendingUp,
  Home,
  MessageSquare,
  Database,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", icon: LayoutDashboard, label: "대시보드", description: "자산 현황" },
  { href: "/rights", icon: Shield, label: "권리분석", description: "등기부 분석" },
  { href: "/registry", icon: FileSearch, label: "등기분석", description: "등기부등본 파싱" },
  { href: "/contract", icon: FileSearch, label: "계약검토", description: "계약서 AI 분석" },
  { href: "/tax", icon: Calculator, label: "세무 시뮬레이션", description: "세금 계산" },
  { href: "/prediction", icon: TrendingUp, label: "가치예측", description: "시세 예측" },
  { href: "/jeonse", icon: Home, label: "전세보호", description: "권리 실행" },
  { href: "/assistant", icon: MessageSquare, label: "AI 어시스턴트", description: "AI 상담" },
  { href: "/api-hub", icon: Database, label: "API 데이터 허브", description: "데이터 현황" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 경로 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
          // 데스크톱
          "max-lg:translate-x-[-100%]",
          mobileOpen && "max-lg:translate-x-0",
          collapsed ? "lg:w-[68px]" : "lg:w-[240px]",
          // 모바일에서는 항상 넓게
          "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm">
              V
            </div>
            {showLabel && (
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  VESTRA
                  <span className="ml-1.5 text-[9px] font-normal text-gray-500 align-middle">v0.2.0</span>
                </h1>
                <p className="text-[10px] text-muted -mt-1">AI 자산관리 플랫폼</p>
              </div>
            )}
          </div>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-hover transition-colors"
            aria-label="메뉴 닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    isActive
                      ? "bg-sidebar-active text-white font-medium"
                      : "text-gray-300 hover:bg-sidebar-hover hover:text-white"
                  )}
                  title={!showLabel ? item.label : undefined}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {showLabel && (
                    <div>
                      <div>{item.label}</div>
                      {!isActive && (
                        <div className="text-[10px] text-gray-500">{item.description}</div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse toggle (데스크톱 전용) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-12 border-t border-white/10 hover:bg-sidebar-hover transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>
    </>
  );
}
