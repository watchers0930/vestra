"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User, LogOut, LogIn, Crown, Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  ADMIN: { label: "관리자", color: "bg-red-500/80", icon: Crown },
  REALESTATE: { label: "부동산", color: "bg-emerald-500/80", icon: Home },
  BUSINESS: { label: "기업", color: "bg-blue-500/80", icon: Building2 },
  PERSONAL: { label: "개인", color: "bg-gray-500/80", icon: User },
  GUEST: { label: "게스트", color: "bg-gray-400/80", icon: User },
};

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="px-2.5 py-3 border-t border-white/5">
        <div className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="px-2.5 py-3 border-t border-white/5">
        <Link
          href="/login"
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium",
            "bg-gradient-to-r from-blue-600 to-blue-500 text-white",
            "hover:from-blue-500 hover:to-blue-400 transition-all duration-200",
            "shadow-lg shadow-blue-500/10",
            collapsed && "justify-center",
          )}
          title={collapsed ? "로그인" : undefined}
        >
          <LogIn size={18} className="flex-shrink-0" />
          {!collapsed && <span>로그인 / 회원가입</span>}
        </Link>
      </div>
    );
  }

  const role = session.user.role || "PERSONAL";
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.PERSONAL;
  const RoleIcon = config.icon;

  return (
    <div className="px-2.5 py-3 border-t border-white/5 space-y-1">
      <Link
        href="/profile"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl profile-card",
          "hover:border-white/10 transition-[background-color,border-color] duration-200",
        )}
        title={collapsed ? session.user.name || "프로필" : undefined}
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
            <User size={14} />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="truncate text-white text-xs font-medium">
              {session.user.name || "사용자"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-white/90 font-medium",
                config.color
              )}>
                <RoleIcon size={9} />
                {config.label}
              </span>
            </div>
          </div>
        )}
      </Link>
      {!collapsed && (
        <button
          onClick={() => signOut({ redirectTo: "/" })}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white/[0.04] hover:text-gray-300 transition-colors duration-200 w-full"
        >
          <LogOut size={14} className="flex-shrink-0" />
          <span>로그아웃</span>
        </button>
      )}
    </div>
  );
}
