"use client";

import { useState } from "react";
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Loader2,
  Mail,
} from "lucide-react";
import { Card, CardHeader, CardContent, Badge, Button } from "@/components/common";

// ─── 타입 ───

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

interface VerificationFlowProps {
  sentRequests: VerificationRequest[];
  receivedRequests: VerificationRequest[];
  onSendRequest: (data: {
    targetEmail: string;
    targetRole: "landlord" | "tenant";
    propertyAddress: string;
    analysisIds?: string[];
  }) => Promise<void>;
  onRespond: (requestId: string, action: "accept" | "reject") => Promise<void>;
  loading?: boolean;
}

// ─── 상태 배지 ───

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "danger" | "warning" | "neutral"; icon: typeof Clock }
> = {
  pending: { label: "대기중", variant: "warning", icon: Clock },
  accepted: { label: "수락됨", variant: "success", icon: CheckCircle2 },
  rejected: { label: "거절됨", variant: "danger", icon: XCircle },
  expired: { label: "만료됨", variant: "neutral", icon: Clock },
};

const ROLE_LABEL: Record<string, string> = {
  landlord: "임대인",
  tenant: "임차인",
};

// ─── 메인 컴포넌트 ───

export default function VerificationFlow({
  sentRequests,
  receivedRequests,
  onSendRequest,
  onRespond,
  loading = false,
}: VerificationFlowProps) {
  const [tab, setTab] = useState<"send" | "sent" | "received">("send");
  const [form, setForm] = useState({
    targetEmail: "",
    targetRole: "landlord" as "landlord" | "tenant",
    propertyAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.targetEmail || !form.propertyAddress) return;
    setSubmitting(true);
    try {
      await onSendRequest(form);
      setForm({ targetEmail: "", targetRole: "landlord", propertyAddress: "" });
      setTab("sent");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRespond(id: string, action: "accept" | "reject") {
    setRespondingId(id);
    try {
      await onRespond(id, action);
    } finally {
      setRespondingId(null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {[
          { key: "send" as const, label: "새 요청", icon: Send },
          { key: "sent" as const, label: `보낸 요청 (${sentRequests.length})`, icon: Mail },
          { key: "received" as const, label: `받은 요청 (${receivedRequests.length})`, icon: Users },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* 새 요청 폼 */}
      {tab === "send" && (
        <Card>
          <CardHeader title="상호검증 요청 보내기" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">상대방 이메일</label>
                <input
                  type="email"
                  value={form.targetEmail}
                  onChange={(e) => setForm({ ...form, targetEmail: e.target.value })}
                  placeholder="landlord@example.com"
                  required
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium">상대방 역할</label>
                <select
                  value={form.targetRole}
                  onChange={(e) =>
                    setForm({ ...form, targetRole: e.target.value as "landlord" | "tenant" })
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="landlord">임대인</option>
                  <option value="tenant">임차인</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">물건 주소</label>
                <input
                  type="text"
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  placeholder="서울시 강남구 역삼동 123-45"
                  required
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                검증 요청 보내기
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 보낸 요청 목록 */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sentRequests.length === 0 ? (
            <Card className="p-8 text-center text-muted text-sm">
              보낸 상호검증 요청이 없습니다
            </Card>
          ) : (
            sentRequests.map((req) => {
              const status = STATUS_MAP[req.status] || STATUS_MAP.pending;
              const StatusIcon = status.icon;
              return (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{req.propertyAddress}</p>
                      <p className="text-xs text-muted">
                        {ROLE_LABEL[req.targetRole]} · {req.targetEmail}
                      </p>
                      <p className="text-xs text-muted">
                        요청일: {formatDate(req.createdAt)} · 만료: {formatDate(req.expiresAt)}
                      </p>
                    </div>
                    <Badge variant={status.variant} icon={StatusIcon} size="md">
                      {status.label}
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 받은 요청 목록 */}
      {tab === "received" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : receivedRequests.length === 0 ? (
            <Card className="p-8 text-center text-muted text-sm">
              받은 상호검증 요청이 없습니다
            </Card>
          ) : (
            receivedRequests.map((req) => {
              const status = STATUS_MAP[req.status] || STATUS_MAP.pending;
              const StatusIcon = status.icon;
              const isPending = req.status === "pending";
              const isResponding = respondingId === req.id;

              return (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{req.propertyAddress}</p>
                      <p className="text-xs text-muted">
                        요청자 역할: {ROLE_LABEL[req.targetRole === "landlord" ? "tenant" : "landlord"]}
                      </p>
                      <p className="text-xs text-muted">
                        요청일: {formatDate(req.createdAt)} · 만료: {formatDate(req.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleRespond(req.id, "accept")}
                            disabled={isResponding}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {isResponding ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            수락
                          </button>
                          <button
                            onClick={() => handleRespond(req.id, "reject")}
                            disabled={isResponding}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={12} />
                            거절
                          </button>
                        </>
                      ) : (
                        <Badge variant={status.variant} icon={StatusIcon} size="md">
                          {status.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
