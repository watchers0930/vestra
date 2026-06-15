"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Phone, Mail, ChevronRight, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import type { ClientCardClient } from "./ClientCard";

interface ClientListProps {
  clients: ClientCardClient[];
  onDelete: (id: string) => void;
  onToggleMonitoring: (id: string) => Promise<unknown>;
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "info" | "neutral" }> = {
  active: { label: "활성", variant: "success" },
  invited: { label: "초대중", variant: "info" },
  inactive: { label: "비활성", variant: "neutral" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function MonitoringToggle({ clientId, active, onToggle }: { clientId: string; active: boolean; onToggle: (id: string) => Promise<unknown> }) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggle(clientId);
    } catch {
      // 실패 시 무시 (hook에서 낙관적 업데이트 롤백 없음)
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={active ? "감시 중단" : "감시 시작"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        border: "none",
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.15s",
        background: active ? "rgba(52,199,89,0.10)" : "rgba(110,110,115,0.08)",
        color: active ? "#1d9e44" : "#6e6e73",
        outline: `1.5px solid ${active ? "rgba(52,199,89,0.30)" : "rgba(110,110,115,0.20)"}`,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? "#30d158" : "#c7c7cc",
          flexShrink: 0,
        }}
      />
      {loading ? "전환 중..." : active ? "감시 중" : "감시 중단"}
    </button>
  );
}

export function ClientList({ clients, onDelete, onToggleMonitoring, loading }: ClientListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="등록된 고객이 없습니다"
        description="상단의 고객 추가 버튼으로 고객을 등록하세요."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e5e5e7] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e5e5e7] bg-[#f5f5f7]">
            <th className="px-4 py-3 text-left text-[11px] font-700 text-[#6e6e73] tracking-wide">고객명</th>
            <th className="px-4 py-3 text-left text-[11px] font-700 text-[#6e6e73] tracking-wide hidden sm:table-cell">연락처</th>
            <th className="px-4 py-3 text-left text-[11px] font-700 text-[#6e6e73] tracking-wide hidden md:table-cell">이메일</th>
            <th className="px-4 py-3 text-center text-[11px] font-700 text-[#6e6e73] tracking-wide">물건</th>
            <th className="px-4 py-3 text-center text-[11px] font-700 text-[#6e6e73] tracking-wide">구분</th>
            <th className="px-4 py-3 text-center text-[11px] font-700 text-[#6e6e73] tracking-wide">등기감시</th>
            <th className="px-4 py-3 text-right text-[11px] font-700 text-[#6e6e73] tracking-wide hidden lg:table-cell">등록일</th>
            <th className="px-4 py-3 text-right text-[11px] font-700 text-[#6e6e73] tracking-wide"></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.inactive;
            const isTypeA = !!client.clientUserId;
            const hasProperties = (client._count?.properties ?? 0) > 0;

            return (
              <tr
                key={client.id}
                className="hover:bg-[#fafafa] transition-colors group"
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                {/* 고객명 + 상태 */}
                <td className="px-4 py-3">
                  <Link href={`/agent/clients/${client.id}`} className="block">
                    <span className="font-semibold text-[13px] text-[#1d1d1f] group-hover:text-primary transition-colors">
                      {client.clientName}
                    </span>
                    <div className="mt-0.5">
                      <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
                    </div>
                  </Link>
                </td>

                {/* 연락처 */}
                <td className="px-4 py-3 text-[12px] text-[#6e6e73] hidden sm:table-cell">
                  {client.clientPhone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone size={11} className="shrink-0" />
                      {client.clientPhone}
                    </span>
                  ) : <span className="text-[#c7c7cc]">-</span>}
                </td>

                {/* 이메일 */}
                <td className="px-4 py-3 text-[12px] text-[#6e6e73] hidden md:table-cell max-w-[160px]">
                  {client.clientEmail ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{client.clientEmail}</span>
                    </span>
                  ) : <span className="text-[#c7c7cc]">-</span>}
                </td>

                {/* 물건 수 */}
                <td className="px-4 py-3 text-center">
                  <span className="text-[12px] font-semibold text-[#1d1d1f]">
                    {client._count?.properties ?? 0}건
                  </span>
                </td>

                {/* A/B 타입 배지 */}
                <td className="px-4 py-3 text-center">
                  {isTypeA ? (
                    <span
                      title="VESTRA 가입 고객"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700,
                        background: "rgba(0,113,227,0.07)", color: "#0071e3",
                        border: "1px solid rgba(0,113,227,0.18)",
                      }}
                    >
                      <ShieldCheck size={10} />A
                    </span>
                  ) : (
                    <span
                      title="미가입 고객"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 999,
                        fontSize: 10.5, fontWeight: 700,
                        background: "rgba(110,110,115,0.07)", color: "#6e6e73",
                        border: "1px solid rgba(110,110,115,0.18)",
                      }}
                    >
                      <ShieldOff size={10} />B
                    </span>
                  )}
                </td>

                {/* 등기감시 토글 / 발급 버튼 */}
                <td className="px-4 py-3 text-center">
                  {isTypeA && hasProperties ? (
                    <MonitoringToggle
                      clientId={client.id}
                      active={!!client.monitoringActive}
                      onToggle={onToggleMonitoring}
                    />
                  ) : isTypeA && !hasProperties ? (
                    <span className="text-[11px] text-[#c7c7cc]">물건 없음</span>
                  ) : (
                    /* B타입: 감시 상태 뱃지 */
                    client.monitoringActive ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "3px 8px", borderRadius: 999,
                        fontSize: 11, fontWeight: 700,
                        background: "rgba(52,199,89,0.1)", color: "#1a7f37",
                        border: "1px solid rgba(52,199,89,0.3)",
                      }}>
                        🛡 감시 중
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "3px 8px", borderRadius: 999,
                        fontSize: 11, fontWeight: 700,
                        background: "rgba(110,110,115,0.07)", color: "#6e6e73",
                        border: "1px solid rgba(110,110,115,0.18)",
                      }}>
                        미등록
                      </span>
                    )
                  )}
                </td>

                {/* 등록일 */}
                <td className="px-4 py-3 text-right text-[12px] text-[#86868b] hidden lg:table-cell whitespace-nowrap">
                  {formatDate(client.contractDate ?? client.createdAt)}
                </td>

                {/* 상세 + 삭제 */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        if (confirm(`${client.clientName} 고객을 삭제하시겠습니까?`)) {
                          onDelete(client.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={13} className="text-[#c7c7cc] hover:text-red-500 transition-colors" />
                    </button>
                    <Link href={`/agent/clients/${client.id}`} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors">
                      <ChevronRight size={14} className="text-[#c7c7cc] group-hover:text-primary transition-colors" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
