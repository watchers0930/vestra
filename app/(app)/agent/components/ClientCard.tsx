"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Calendar, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";

export interface ClientCardClient {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientUserId?: string | null;
  status: string;
  propertyAddress?: string | null;
  contractDate?: string | null;
  createdAt: string;
  _count?: { properties: number };
  monitoringActive?: boolean;
}

interface ClientCardProps {
  client: ClientCardClient;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "info" | "neutral" }> = {
  active: { label: "활성", variant: "success" },
  invited: { label: "초대중", variant: "info" },
  inactive: { label: "비활성", variant: "neutral" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function ClientCard({ client, onDelete }: ClientCardProps) {
  const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.inactive;

  return (
    <Card hover className="relative overflow-hidden group">
      <div className="p-5">
        {/* 헤더: 이름 + 상태 배지 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link href={`/agent/clients/${client.id}`} className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-[#1d1d1f] truncate leading-tight group-hover:text-primary transition-colors">
              {client.clientName}
            </h3>
          </Link>
          <Badge variant={statusCfg.variant} size="sm">
            {statusCfg.label}
          </Badge>
        </div>

        {/* 연락처 */}
        <div className="space-y-1.5 mb-3">
          {client.clientPhone && (
            <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
              <Phone size={12} className="shrink-0" />
              <span>{client.clientPhone}</span>
            </div>
          )}
          {client.clientEmail && (
            <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
              <Mail size={12} className="shrink-0" />
              <span className="truncate">{client.clientEmail}</span>
            </div>
          )}
        </div>

        {/* 물건 주소 */}
        {client.propertyAddress && (
          <div className="flex items-center gap-2 text-[12px] text-[#6e6e73] mb-2">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{client.propertyAddress}</span>
          </div>
        )}

        {/* 하단: 날짜 + 물건 수 + 액션 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-[11px] text-[#86868b]">
            <div className="flex items-center gap-1">
              <Calendar size={11} />
              <span>{client.contractDate ? formatDate(client.contractDate) : formatDate(client.createdAt)}</span>
            </div>
            {client._count && client._count.properties > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#f5f5f7] text-[#6e6e73] font-medium">
                물건 {client._count.properties}건
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                if (confirm(`${client.clientName} 고객을 삭제하시겠습니까?`)) {
                  onDelete(client.id);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="삭제"
            >
              <Trash2 size={13} className="text-[#86868b] hover:text-red-500" />
            </button>
            <Link href={`/agent/clients/${client.id}`} className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors">
              <ChevronRight size={14} className="text-[#c7c7cc] group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
