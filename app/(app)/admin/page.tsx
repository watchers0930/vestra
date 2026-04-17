"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LoadingSpinner } from "@/components/loading";
import { PageHeader } from "@/components/common";
import { MlTrainingTab } from "@/components/admin/MlTrainingTab";
import { IntegrityAuditTab } from "@/components/admin/IntegrityAuditTab";
import { ApiKeyTab } from "@/components/admin/ApiKeyTab";
import { GuaranteeRulesTab } from "@/components/admin/GuaranteeRulesTab";
import { LoanRatesTab } from "@/components/admin/LoanRatesTab";
import dynamic from "next/dynamic";
import { useAdminData } from "./hooks/useAdminData";
import { OverviewTab } from "./components/OverviewTab";
import { UsersTab } from "./components/UsersTab";
import { VerificationsTab } from "./components/VerificationsTab";
import { AnalysesTab } from "./components/AnalysesTab";
import { AnnouncementsTab } from "./components/AnnouncementsTab";
import { AccountTab } from "./components/AccountTab";
import { ConfirmModal } from "./components/ConfirmModal";
import type { Tab } from "./types";

const WeightTuningTab = dynamic(
  () => import("@/components/admin/WeightTuningTab").then((mod) => ({ default: mod.WeightTuningTab })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);
const NewsTab = dynamic(
  () => import("@/components/admin/NewsTab").then((mod) => ({ default: mod.NewsTab })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const data = useAdminData();

  if (data.status === "loading") return <LoadingSpinner message="권한 확인 중..." />;
  if (!data.session?.user || data.session.user.role !== "ADMIN") return null;

  const urlTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = urlTab && data.tabs.some((t) => t.key === urlTab) ? urlTab : "overview";

  const setTab = (newTab: Tab) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.push(newTab === "overview" ? "/admin" : `/admin?tab=${newTab}`);
  };

  void setTab; // available for future tab navigation UI

  const activeTabInfo = data.tabs.find((t) => t.key === tab) ?? data.tabs[0];

  return (
    <div>
      <PageHeader
        title={activeTabInfo.label}
        description={activeTabInfo.description}
        icon={ShieldCheck}
      />

      {data.loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {tab === "overview" && data.stats && <OverviewTab stats={data.stats} />}

          {tab === "users" && (
            <UsersTab
              users={data.users}
              filteredUsers={data.filteredUsers}
              roleFilter={data.roleFilter}
              setRoleFilter={data.setRoleFilter}
              editingUserId={data.editingUserId}
              setEditingUserId={data.setEditingUserId}
              editRole={data.editRole}
              setEditRole={data.setEditRole}
              editLimit={data.editLimit}
              setEditLimit={data.setEditLimit}
              deleteConfirmId={data.deleteConfirmId}
              setDeleteConfirmId={data.setDeleteConfirmId}
              startEditing={data.startEditing}
              setConfirmModal={data.setConfirmModal}
              handleUserEdit={data.handleUserEdit}
              handleDeleteUser={data.handleDeleteUser}
            />
          )}

          {tab === "verifications" && (
            <VerificationsTab
              pending={data.pending}
              setConfirmModal={data.setConfirmModal}
              handleVerify={data.handleVerify}
            />
          )}

          {tab === "analyses" && (
            <AnalysesTab
              analyses={data.analyses}
              filteredAnalyses={data.filteredAnalyses}
              analysisTypeFilter={data.analysisTypeFilter}
              setAnalysisTypeFilter={data.setAnalysisTypeFilter}
            />
          )}

          {tab === "announcements" && (
            <AnnouncementsTab
              announcements={data.announcements}
              announcementForm={data.announcementForm}
              setAnnouncementForm={data.setAnnouncementForm}
              editingAnnouncementId={data.editingAnnouncementId}
              setEditingAnnouncementId={data.setEditingAnnouncementId}
              announcementLoading={data.announcementLoading}
              handleSaveAnnouncement={data.handleSaveAnnouncement}
              handleDeleteAnnouncement={data.handleDeleteAnnouncement}
              startEditAnnouncement={data.startEditAnnouncement}
            />
          )}

          {tab === "apikey" && (
            <ApiKeyTab
              initialSocialProviders={data.apiKeyInitData.providers}
              initialPgProviders={data.apiKeyInitData.pgProviders}
              initialScholarProviders={data.apiKeyInitData.scholarProviders}
            />
          )}

          {tab === "ml-training" && <MlTrainingTab />}
          {tab === "weight-tuning" && <WeightTuningTab />}
          {tab === "integrity-audit" && <IntegrityAuditTab />}
          {tab === "news" && <NewsTab />}
          {tab === "guarantee-rules" && <GuaranteeRulesTab />}
          {tab === "loan-rates" && <LoanRatesTab />}

          {tab === "account" && (
            <AccountTab
              currentPw={data.currentPw}
              setCurrentPw={data.setCurrentPw}
              newPw={data.newPw}
              setNewPw={data.setNewPw}
              confirmPw={data.confirmPw}
              setConfirmPw={data.setConfirmPw}
              pwMsg={data.pwMsg}
              pwLoading={data.pwLoading}
              handlePasswordChange={data.handlePasswordChange}
            />
          )}
        </>
      )}

      {data.confirmModal && (
        <ConfirmModal
          message={data.confirmModal.message}
          onConfirm={data.confirmModal.onConfirm}
          onCancel={() => data.setConfirmModal(null)}
        />
      )}
    </div>
  );
}
