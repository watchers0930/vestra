"use client";

import Link from "next/link";
import { Users, Phone, Mail, ChevronRight, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import type { ClientCardClient } from "./ClientCard";

interface ClientListProps {
  clients: ClientCardClient[];
  onDelete: (id: string) => void;
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

export function ClientList({ clients, onDelete, loading }: ClientListProps) {
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
            <th className="px-4 py-3 text-left text-[11px] font-700 text-[#6e6e73] tracking-wide">연락처</th>
            <th className="px-4 py-3 text-left text-[11px] font-700 text-[#6e6e73] tracking-wide hidden sm:table-cell">이메일</th>
            <th className="px-4 py-3 text-center text-[11px] font-700 text-[#6e6e73] tracking-wide">물건</th>
            <th className="px-4 py-3 text-center text-[11px] font-700 text-[#6e6e73] tracking-wide hidden md:table-cell">상태</th>
            <th className="px-4 py-3 text-right text-[11px] font-700 text-[#6e6e73] tracking-wide hidden lg:table-cell">등록일</th>
            <th className="px-4 py-3 text-right text-[11px] font-700 text-[#6e6e73] tracking-wide">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e5e7]">
          {clients.map((client) => {
            const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.inactive;
            return (
              <tr key={client.id} className="hover:bg-[#fafafa] transition-colors group">
                {/* 고객명 */}
                <td className="px-4 py-3">
                  <Link
                    href={`/agent/clients/${client.id}`}
                    className="font-semibold text-[13px] text-[#1d1d1f] group-hover:text-primary transition-colors"
                  >
                    {client.clientName}
                  </Link>
                </td>

                {/* 연락처 */}
                <td className="px-4 py-3 text-[12px] text-[#6e6e73]">
                  {client.clientPhone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone size={11} className="shrink-0" />
                      {client.clientPhone}
                    </span>
                  ) : (
                    <span className="text-[#c7c7cc]">-</span>
                  )}
                </td>

                {/* 이메일 */}
                <td className="px-4 py-3 text-[12px] text-[#6e6e73] hidden sm:table-cell max-w-[180px]">
                  {client.clientEmail ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{client.clientEmail}</span>
                    </span>
                  ) : (
                    <span className="text-[#c7c7cc]">-</span>
                  )}
                </td>

                {/* 물건수 */}
                <td className="px-4 py-3 text-center">
                  <span className="text-[12px] font-semibold text-[#1d1d1f]">
                    {client._count?.properties ?? 0}건
                  </span>
                </td>

                {/* 상태 */}
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
                </td>

                {/* 등록일 */}
                <td className="px-4 py-3 text-right text-[12px] text-[#86868b] hidden lg:table-cell whitespace-nowrap">
                  {formatDate(client.contractDate ?? client.createdAt)}
                </td>

                {/* 액션 */}
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
                    <Link
                      href={`/agent/clients/${client.id}`}
                      className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
                    >
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
