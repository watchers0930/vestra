"use client";

import { Users } from "lucide-react";
import { Skeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ClientCard } from "./ClientCard";
import type { ClientCardClient } from "./ClientCard";

interface ClientListProps {
  clients: ClientCardClient[];
  onDelete: (id: string) => void;
  loading: boolean;
}

export function ClientList({ clients, onDelete, loading }: ClientListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-[180px]" />
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} onDelete={onDelete} />
      ))}
    </div>
  );
}
