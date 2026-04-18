"use client";

import { ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader, Alert } from "@/components/common";
import VerificationFlow from "@/components/verification/VerificationFlow";
import { useVerificationData } from "./hooks/useVerificationData";

export default function VerificationPage() {
  const {
    sentRequests,
    receivedRequests,
    loading,
    error,
    handleSendRequest,
    handleRespond,
  } = useVerificationData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="상호검증"
        description="임대인과 임차인이 서로의 분석 결과를 검증하여 안전한 거래를 지원합니다"
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <VerificationFlow
        sentRequests={sentRequests}
        receivedRequests={receivedRequests}
        onSendRequest={handleSendRequest}
        onRespond={handleRespond}
        loading={loading}
      />
    </div>
  );
}
