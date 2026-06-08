"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, Plus } from "lucide-react";

interface DashboardPageTopbarProps {
  current: string;
  primaryHref?: string;
  primaryLabel?: string;
}

interface DashboardPageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  actions?: ReactNode;
  statItems?: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    iconBg?: string;
    iconColor?: string;
    valueColor?: string;
  }>;
}

export function DashboardPageTopbar({
  current,
  primaryHref = "/rights",
  primaryLabel = "새 분석",
}: DashboardPageTopbarProps) {
  return (
    <div
      className="fixed top-0 z-40 flex h-[52px] items-center justify-between border-b border-black/[0.06] px-4 sm:px-6 lg:px-9 left-0 lg:left-[272px] right-0"
      style={{
        background: "rgba(245,245,247,0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="flex items-center gap-2 text-[12.5px] text-[#6e6e73]">
        <span>VESTRA</span>
        <span className="text-[#ccc]">›</span>
        <span className="font-semibold text-[#1d1d1f]">{current}</span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="flex items-center gap-[5px] rounded-full border border-black/[0.08] bg-white px-[14px] py-[6px] text-[12.5px] font-medium text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#ebebed]"
        >
          <Bell size={13} strokeWidth={1.5} />
          알림
        </Link>

        <Link
          href={primaryHref}
          className="flex items-center gap-[5px] rounded-full bg-[#1d1d1f] px-[14px] py-[6px] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#333]"
        >
          <Plus size={13} strokeWidth={2.5} />
          {primaryLabel}
        </Link>
      </div>
    </div>
  );
}

export function DashboardPageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  statItems = [],
}: DashboardPageHeroProps) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "32px",
        background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
      }}
    >
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: "-96px",
          right: "-40px",
          height: "420px",
          width: "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)",
        }}
      />
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          bottom: "-80px",
          left: "300px",
          height: "300px",
          width: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(41,151,255,0.08) 0%, transparent 65%)",
        }}
      />
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-[1] flex items-center gap-8 p-7 sm:p-10 xl:p-[52px]">
        <div className="min-w-0 flex-1">
          <div
            className="mb-[18px] inline-flex items-center gap-[6px] rounded-full px-[11px] py-[4px] text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: "#2997ff",
              background: "rgba(41,151,255,0.10)",
              border: "1px solid rgba(41,151,255,0.20)",
            }}
          >
            <Icon size={12} strokeWidth={2} />
            {eyebrow}
          </div>

          <h1 className="mb-[10px] leading-[1.2] tracking-[-0.03em] text-white">
            <span className="block font-bold" style={{ fontSize: "clamp(28px, 3vw, 40px)" }}>
              {title}
            </span>
          </h1>

          <p className="mb-[30px] max-w-3xl text-[15px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.52)" }}>
            {description}
          </p>

          {actions ? <div className="flex flex-wrap gap-[10px]">{actions}</div> : null}
        </div>

        {statItems.length > 0 && (
          <div className="hidden xl:block w-[230px] shrink-0">
            <div className="flex flex-col gap-3">
              {statItems.map((item) => (
                <HeroStatCard key={item.label} {...item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HeroStatCard({
  icon: Icon,
  iconBg = "rgba(41,151,255,0.12)",
  iconColor = "#2997ff",
  value,
  valueColor = "#fff",
  label,
}: {
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  value: string;
  valueColor?: string;
  label: string;
}) {
  return (
    <div
      className="flex items-center gap-[14px] rounded-[16px] px-[18px] py-[14px]"
      style={{
        background: "rgba(255,255,255,0.055)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: iconBg }}
      >
        <Icon size={17} strokeWidth={1.7} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[20px] font-bold leading-none tracking-[-0.02em]" style={{ color: valueColor }}>
          {value}
        </div>
        <div className="mt-[3px] text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {label}
        </div>
      </div>
    </div>
  );
}
