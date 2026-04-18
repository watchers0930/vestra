"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface VerificationRequest {
  id: string;
  propertyAddress: string;
  targetEmail: string;
  targetRole: "landlord" | "tenant";
  status: "pending" | "accepted" | "rejected" | "expired";
  createdAt: string;
  expiresAt: string;
  sharedReports?: { id: string; analysisId: string }[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useVerificationData() {
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

  const handleSendRequest = async (formData: {
    targetEmail: string;
    targetRole: "landlord" | "tenant";
    propertyAddress: string;
    analysisIds?: string[];
  }) => {
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
  };

  const handleRespond = async (requestId: string, action: "accept" | "reject") => {
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
  };

  return {
    sentRequests,
    receivedRequests,
    loading,
    error,
    handleSendRequest,
    handleRespond,
  };
}
