"use client";

import { useState } from "react";
import { Briefcase, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/common/Button";
import { useAgentData } from "./hooks/useAgentData";
import { AgentKpiRow } from "./components/AgentKpiRow";
import { ClientList } from "./components/ClientList";
import { AddClientModal } from "./components/AddClientModal";

export default function AgentPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  const {
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
  } = useAgentData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <PageHeader
          icon={Briefcase}
          title="중개관리"
          description="고객 관리, 물건 감시, 계약 현황을 한 곳에서 관리합니다"
        />
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowAddModal(true)}
        >
          고객 추가
        </Button>
      </div>

      <div className="mt-8 space-y-8">
        {/* KPI 통계 */}
        <AgentKpiRow stats={stats} />

        {/* 검색바 */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="고객명, 전화번호, 주소로 검색..."
            className="w-full pr-4 py-2.5 rounded-xl border border-[#e5e5e7] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {/* 고객 목록 */}
        <ClientList
          clients={clients}
          onDelete={deleteClient}
          loading={loading}
        />

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              이전
            </Button>
            <span className="text-sm text-[#6e6e73] font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              다음
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* 고객 추가 모달 */}
      <AddClientModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addClient}
      />
    </div>
  );
}
