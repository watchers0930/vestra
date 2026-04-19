"use client";

import Link from "next/link";
import { Shield, FileText, BarChart2 } from "lucide-react";
import type { Session } from "next-auth";

function toEok(value: number): string {
  if (value <= 0) return "-";
  const eok = value / 100_000_000;
  return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
}

interface Props {
  session: Session | null;
  totalAssets: number;
  totalValue: number;
  avgSafety: number;
  mounted: boolean;
}

export function DashboardHero({ session, totalAssets, totalValue, avgSafety, mounted }: Props) {
  const displayName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "대장님";

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "32px",
        background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
      }}
    >
      {/* 배경 글로우 */}
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
      {/* 격자 패턴 */}
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

      {/* ── flex 레이아웃 ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: "32px",
          padding: "52px",
        }}
      >

        {/* 좌측 콘텐츠 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mb-[18px] inline-flex items-center gap-[5px] rounded-full px-[11px] py-[4px] text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: "#2997ff",
              background: "rgba(41,151,255,0.10)",
              border: "1px solid rgba(41,151,255,0.20)",
            }}
          >
            ✦ AI 자산 분석 플랫폼
          </div>

          <h1
            className="mb-[10px] font-bold leading-[1.15] tracking-[-0.03em] text-white"
            style={{ fontSize: "clamp(28px, 3vw, 40px)" }}
          >
            안녕하세요,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #2997ff, #74d0ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {displayName}
            </span>
            님.<br />
            오늘도 자산을 지키세요.
          </h1>

          <p className="mb-[30px] text-[15px] leading-[1.65]" style={{ color: "rgba(255,255,255,0.42)" }}>
            {mounted && totalAssets > 0
              ? `${totalAssets}개 자산을 실시간 모니터링 중입니다.`
              : "아직 분석한 자산이 없습니다."}
            <br />
            {mounted && avgSafety > 0
              ? `평균 안전지수 ${avgSafety}점`
              : "권리분석부터 시작해보세요."}
          </p>

          <div className="flex flex-wrap gap-[10px]">
            <Link
              href="/rights"
              className="inline-flex items-center gap-[6px] rounded-full bg-[#0071e3] px-[22px] py-[12px] text-[13.5px] font-semibold text-white transition-all hover:bg-[#0077ed] hover:scale-[1.02]"
            >
              <Shield size={14} strokeWidth={2} />
              권리분석 시작
            </Link>
            <Link
              href="/contract"
              className="inline-flex items-center gap-[6px] rounded-full px-[22px] py-[12px] text-[13.5px] font-medium transition-all"
              style={{
                color: "rgba(255,255,255,0.85)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <FileText size={14} strokeWidth={1.5} />
              계약검토
            </Link>
            <Link
              href="/decision-report"
              className="inline-flex items-center gap-[6px] rounded-full px-[22px] py-[12px] text-[13.5px] font-medium transition-all"
              style={{
                color: "rgba(255,255,255,0.85)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <BarChart2 size={14} strokeWidth={1.5} />
              리포트 보기
            </Link>
          </div>
        </div>

        {/* 우측 플로팅 스탯 카드 (xl 이상에서만 표시) */}
        <div className="hidden xl:block" style={{ width: "210px", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <StatCard
            icon="🏢"
            iconBg="rgba(41,151,255,0.12)"
            value={mounted ? `${totalAssets}건` : "-"}
            valueColor="#2997ff"
            label="관리 자산"
          />
          <StatCard
            icon="💰"
            iconBg="rgba(255,255,255,0.07)"
            value={mounted && totalValue > 0 ? toEok(totalValue) : "-"}
            valueColor="#fff"
            label="총 평가액"
          />
          <StatCard
            icon="🛡️"
            iconBg="rgba(48,209,88,0.12)"
            value={mounted && avgSafety > 0 ? `${avgSafety}점` : "-"}
            valueColor="#30d158"
            label="평균 안전지수"
          />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  valueColor,
  label,
}: {
  icon: string;
  iconBg: string;
  value: string;
  valueColor: string;
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
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] text-[15px]"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div>
        <div
          className="text-[20px] font-bold leading-none tracking-[-0.02em]"
          style={{ color: valueColor }}
        >
          {value}
        </div>
        <div className="mt-[3px] text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {label}
        </div>
      </div>
    </div>
  );
}
