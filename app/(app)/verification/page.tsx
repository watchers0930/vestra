"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader, Alert } from "@/components/common";
import VerificationFlow from "@/components/verification/VerificationFlow";

interface VerificationRequest {
  id: string;
  propertyAddress: string;
  targetEmail: string;
  targetRole: "landlord" | "tenant";
  status: "pending" | "accepted" | "rejected" | "expired";
  createdAt: string;
  expiresAt: string;
  sharedReports?: { id: string; analysisId: string }[];
}

export default function VerificationPage() {
  const [sentRequests, setSentRequests] = useState<VerificationRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/verification/request");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "요청 목록을 불러올 수 없습니다");
      }
      const data = await res.json();
      setSentRequests(data.sent || []);
      setReceivedRequests(data.received || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleSendRequest(formData: {
    targetEmail: string;
    targetRole: "landlord" | "tenant";
    propertyAddress: string;
    analysisIds?: string[];
  }) {
    setError(null);
    const res = await fetch("/api/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "요청 전송에 실패했습니다");
    }
    await fetchRequests();
  }

  async function handleRespond(requestId: string, action: "accept" | "reject") {
    setError(null);
    const res = await fetch("/api/verification/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "응답 처리에 실패했습니다");
    }
    await fetchRequests();
  }

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
