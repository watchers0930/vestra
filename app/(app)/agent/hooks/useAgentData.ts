"use client";

import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import { useSession } from "next-auth/react";

export interface AgentClient {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  status: string;
  propertyAddress?: string | null;
  contractDate?: string | null;
  createdAt: string;
  _count?: { properties: number };
}

export interface AgentStats {
  totalClients: number;
  activeProperties: number;
  recentAlerts: number;
  invitedClients: number;
}

interface AddClientPayload {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  memo?: string;
  contractDate?: string;
  propertyAddress?: string;
}

export function useAgentData() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, forceRefresh] = useReducer((c: number) => c + 1, 0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스된 검색어
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // 데이터 로드
  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({ page: String(page) });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const [statsRes, clientsRes] = await Promise.all([
          fetch("/api/agent/stats"),
          fetch(`/api/agent/clients?${params}`),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data.clients || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch {
        /* 조회 실패 무시 */
      }

      setLoading(false);
    }

    setLoading(true);
    load();
  }, [session, page, debouncedSearch, refreshKey]);

  const refresh = useCallback(() => {
    forceRefresh();
  }, []);

  // 고객 추가
  const addClient = useCallback(async (payload: AddClientPayload) => {
    const res = await fetch("/api/agent/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "고객 추가에 실패했습니다.");
    }

    refresh();
    return res.json();
  }, [refresh]);

  // 고객 삭제(비활성화)
  const deleteClient = useCallback(async (id: string) => {
    const res = await fetch(`/api/agent/clients/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "삭제에 실패했습니다.");
    }

    refresh();
  }, [refresh]);

  return {
    stats,
    clients,
    loading,
    page,
    setPage,
    totalPages,
    searchTerm,
    setSearchTerm,
    addClient,
    deleteClient,
    refresh,
  };
}
