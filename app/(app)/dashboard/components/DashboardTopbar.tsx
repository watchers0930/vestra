"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import type { Session } from "next-auth";

interface Props {
  monitoredCount: number;
  session: Session | null;
}

export function DashboardTopbar({ monitoredCount, session }: Props) {
  return (
    <div
      className="fixed top-0 z-40 flex h-[52px] items-center justify-between border-b border-black/[0.06] px-9"
      style={{
        left: 240,
        right: 0,
        background: "rgba(245,245,247,0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="flex items-center gap-2 text-[12.5px] text-[#6e6e73]">
        <span>VESTRA</span>
        <span className="text-[#ccc]">›</span>
        <span className="font-semibold text-[#1d1d1f]">대시보드</span>
      </div>

      <div className="flex items-center gap-2">
        {session?.user && monitoredCount > 0 && (
          <div
            className="flex items-center gap-[5px] rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold text-[#0071e3]"
            style={{
              background: "rgba(0,113,227,0.07)",
              border: "1px solid rgba(0,113,227,0.14)",
            }}
          >
            <span
              className="h-[5px] w-[5px] rounded-full bg-[#0071e3]"
              style={{ animation: "pulse-dot 2s infinite" }}
            />
            모니터링 {monitoredCount}건
          </div>
        )}

        <Link
          href="/profile"
          className="flex items-center gap-[5px] rounded-full border border-black/[0.08] bg-white px-[14px] py-[6px] text-[12.5px] font-medium text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#ebebed]"
        >
          <Bell size={13} strokeWidth={1.5} />
          알림
        </Link>

        <Link
          href="/rights"
          className="flex items-center gap-[5px] rounded-full bg-[#1d1d1f] px-[14px] py-[6px] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#333]"
        >
          <Plus size={13} strokeWidth={2.5} />
          새 분석
        </Link>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%,100%{opacity:1}
          50%{opacity:0.3}
        }
      `}</style>
    </div>
  );
}
