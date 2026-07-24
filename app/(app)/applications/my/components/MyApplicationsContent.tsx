"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Building2, FileText, MessageCircle } from "lucide-react";

interface MyApplication {
  id: string;
  listingId: string;
  moveInDate: string;
  duration: number | null;
  memo: string | null;
  proposedDeposit: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  rejectionReason: string | null;
  createdAt: string;
  listing: {
    address: string;
    listingType: string;
    deposit: string | null;
    photos: string[] | null;
    status: string;
    owner: { name: string | null; companyName: string | null };
  } | null;
}

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만`;
  return `${n.toLocaleString()}원`;
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "검토 중",  color: "#b45309", bg: "rgba(251,191,36,0.12)" },
  ACCEPTED:  { label: "수락됨",  color: "#1a9e45", bg: "rgba(52,199,89,0.12)"  },
  REJECTED:  { label: "거절됨",  color: "#c0392b", bg: "rgba(255,59,48,0.08)"  },
  WITHDRAWN: { label: "철회됨",  color: "#6e6e73", bg: "#f5f5f7"              },
};

export function MyApplicationsContent() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/contract-applications/mine");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleWithdraw(id: string) {
    if (!confirm("이 의향서를 철회하시겠습니까?")) return;
    setWithdrawingId(id);
    try {
      const res = await fetch(`/api/contract-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WITHDRAWN" }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "WITHDRAWN" } : a))
        );
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "처리에 실패했습니다.");
      }
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div style={{ paddingBottom: 48, paddingTop: 8 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#1d1d1f" }}>내가 보낸 의향서</h1>
        <p style={{ fontSize: 13, color: "#6e6e73", marginTop: 4 }}>총 {applications.length}건</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 130, borderRadius: 16, background: "#f5f5f7" }} />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
          <FileText size={36} strokeWidth={1.2} style={{ marginBottom: 12, color: "#c7c7cc" }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>보낸 의향서가 없습니다</p>
          <Link href="/listings" style={{ textDecoration: "none" }}>
            <button
              style={{
                marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 12, background: "#0071e3",
                color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              }}
            >
              매물 목록 보기
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {applications.map((a) => {
            const si = STATUS_INFO[a.status];
            const thumb = a.listing?.photos?.[0] ?? null;
            return (
              <div
                key={a.id}
                style={{
                  background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 18, padding: 20,
                }}
              >
                {/* 매물 정보 */}
                {a.listing && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, background: "#f5f5f7", overflow: "hidden", flexShrink: 0 }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Building2 size={20} strokeWidth={1.2} style={{ color: "#c7c7cc" }} />
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", marginBottom: 2 }}>
                        {a.listing.address}
                      </p>
                      <p style={{ fontSize: 11, color: "#6e6e73" }}>
                        {a.listing.listingType === "JEONSE" ? "전세" : "매매"} {formatWon(a.listing.deposit)}
                        {a.listing.owner && (
                          <span style={{ marginLeft: 6 }}>
                            · {a.listing.owner.companyName ?? a.listing.owner.name ?? ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <Link href={`/listings/${a.listingId}`} style={{ textDecoration: "none" }}>
                      <button
                        style={{
                          padding: "5px 10px", borderRadius: 8, border: "1px solid #d2d2d7",
                          background: "#fff", fontSize: 11, fontWeight: 600, color: "#3d3d3f", cursor: "pointer",
                        }}
                      >
                        매물 보기
                      </button>
                    </Link>
                  </div>
                )}

                {/* 의향서 내용 */}
                <div
                  style={{
                    background: "#f9f9f9", borderRadius: 12, padding: "12px 14px",
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 10, color: "#aeaeb2", marginBottom: 2 }}>입주 희망일</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
                      {new Date(a.moveInDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {a.duration && (
                    <div>
                      <p style={{ fontSize: 10, color: "#aeaeb2", marginBottom: 2 }}>계약 기간</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>{a.duration}개월</p>
                    </div>
                  )}
                  {a.proposedDeposit && (
                    <div>
                      <p style={{ fontSize: 10, color: "#aeaeb2", marginBottom: 2 }}>제안 금액</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0071e3" }}>{formatWon(a.proposedDeposit)}</p>
                    </div>
                  )}
                  {a.memo && (
                    <div style={{ gridColumn: "1/-1" }}>
                      <p style={{ fontSize: 10, color: "#aeaeb2", marginBottom: 2 }}>메모</p>
                      <p style={{ fontSize: 12, color: "#3d3d3f" }}>{a.memo}</p>
                    </div>
                  )}
                </div>

                {/* 거절 사유 */}
                {a.status === "REJECTED" && a.rejectionReason && (
                  <div
                    style={{
                      padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                      background: "rgba(255,59,48,0.05)", border: "1px solid rgba(255,59,48,0.15)",
                    }}
                  >
                    <p style={{ fontSize: 10, color: "#aeaeb2", marginBottom: 2 }}>거절 사유</p>
                    <p style={{ fontSize: 12, color: "#c0392b" }}>{a.rejectionReason}</p>
                  </div>
                )}

                {/* 수락 알림 */}
                {a.status === "ACCEPTED" && (
                  <div
                    style={{
                      padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                      background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)",
                    }}
                  >
                    <p style={{ fontSize: 12, color: "#1a9e45", fontWeight: 600 }}>
                      임대인이 의향서를 수락했습니다. 계약 진행을 협의해보세요.
                    </p>
                  </div>
                )}

                {/* 상태 + 철회 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 100,
                      fontSize: 12, fontWeight: 600,
                      background: si.bg, color: si.color,
                    }}
                  >
                    {si.label}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#aeaeb2" }}>
                      {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                    <Link
                      href={`/chat/${a.id}`}
                      style={{
                        padding: "6px 10px", borderRadius: 10,
                        border: "1px solid #d2d2d7", background: "#f5f5f7",
                        fontSize: 12, fontWeight: 600, color: "#3d3d3f",
                        display: "flex", alignItems: "center", gap: 4,
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle size={13} strokeWidth={2} />
                      채팅
                    </Link>
                    {a.status === "PENDING" && (
                      <button
                        onClick={() => handleWithdraw(a.id)}
                        disabled={withdrawingId === a.id}
                        style={{
                          padding: "6px 12px", borderRadius: 10,
                          border: "1px solid #d2d2d7", background: "#fff",
                          fontSize: 12, fontWeight: 600, color: "#6e6e73", cursor: "pointer",
                        }}
                      >
                        {withdrawingId === a.id ? "처리 중..." : "철회"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
