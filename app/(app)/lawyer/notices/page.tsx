"use client";

import { FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useLawyerDashboard } from "../hooks/useLawyerDashboard";
import { NoticesTab } from "../components/NoticesTab";
import { NoticeReviewModal } from "../components/NoticeReviewModal";

/** 내용증명 검수·전자직인 */
export default function LawyerNoticesPage() {
  const d = useLawyerDashboard(true, false, false);
  return (
    <div>
      <DashboardPageTopbar current="내용증명" primaryHref="/lawyer" primaryLabel="대시보드" />
      <div className="pt-[52px] mt-4">
        <PageHeader icon={FileText} title="내용증명" description="개인이 보낸 내용증명을 원문 검토 후 전자직인을 찍어 발송합니다." />
        {d.loading ? (
          <div className="py-20 text-center text-sm text-gray-400">불러오는 중…</div>
        ) : (
          <NoticesTab cases={d.cases} busy={d.busy} onOpenReview={d.openReview} />
        )}
      </div>
      {d.reviewing && (
        <NoticeReviewModal
          detail={d.reviewing}
          busy={d.busy}
          onApprove={d.approveCase}
          onReject={d.rejectCase}
          onClose={d.closeReview}
        />
      )}
    </div>
  );
}
