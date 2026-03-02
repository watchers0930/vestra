"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User, LogOut, LogIn, Crown, Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  ADMIN: { label: "관리자", color: "bg-red-500", icon: Crown },
  REALESTATE: { label: "부동산", color: "bg-emerald-500", icon: Home },
  BUSINESS: { label: "기업", color: "bg-blue-500", icon: Building2 },
  PERSONAL: { label: "개인", color: "bg-gray-500", icon: User },
  GUEST: { label: "게스트", color: "bg-gray-400", icon: User },
};

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="px-3 py-3 border-t border-white/10">
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="px-2 py-3 border-t border-white/10">
        <Link
          href="/login"
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-all",
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
    <div className="px-2 py-3 border-t border-white/10 space-y-1">
      <Link
        href="/profile"
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-sidebar-hover hover:text-white transition-all",
        )}
        title={collapsed ? session.user.name || "프로필" : undefined}
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-7 h-7 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User size={14} />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="truncate text-white text-xs font-medium">
              {session.user.name || "사용자"}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <RoleIcon size={10} />
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full text-white", config.color)}>
                {config.label}
              </span>
            </div>
          </div>
        )}
      </Link>
      {!collapsed && (
        <button
          onClick={() => signOut({ redirectTo: "/" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-sidebar-hover hover:text-white transition-all w-full"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span>로그아웃</span>
        </button>
      )}
    </div>
  );
}
