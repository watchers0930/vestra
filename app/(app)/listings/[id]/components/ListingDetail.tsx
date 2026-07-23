"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, AreaChart, Layers, Calendar, Eye, FileCheck2,
  ChevronLeft, ChevronRight, Edit2, Trash2, FileText,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { ListingItem } from "../../hooks/useListings";
import { ApplicationModal } from "./ApplicationModal";

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만`;
  return `${n.toLocaleString()}원`;
}

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", SALE: "매매" };
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "거래중", HIDDEN: "숨김", CONTRACTED: "계약완료", COMPLETED: "거래완료",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#34c759", HIDDEN: "#aeaeb2", CONTRACTED: "#0071e3", COMPLETED: "#6e6e73",
};

interface Props { listing: ListingItem; }

export function ListingDetail({ listing }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);

  const photos = listing.photos ?? [];
  const isOwner = session?.user?.id === listing.owner.id;
  const canApply = !!session && !isOwner && listing.status === "ACTIVE";

  async function handleDelete() {
    if (!confirm("이 매물을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      if (res.ok) router.push("/listings/my");
      else alert("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 48 }}>
      {/* 상단 네비게이션 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#6e6e73", fontSize: 14 }}
        >
          <ChevronLeft size={18} strokeWidth={2} />목록으로
        </button>
        {isOwner && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => router.push(`/listings/${listing.id}/edit`)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7",
                background: "#fff", fontSize: 13, fontWeight: 600, color: "#3d3d3f", cursor: "pointer",
              }}
            >
              <Edit2 size={13} strokeWidth={2} />수정
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,59,48,0.3)",
                background: "rgba(255,59,48,0.05)", fontSize: 13, fontWeight: 600, color: "#c0392b",
                cursor: deleting ? "not-allowed" : "pointer",
              }}
            >
              <Trash2 size={13} strokeWidth={2} />{deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        )}
      </div>

      {/* 사진 슬라이더 */}
      <div
        style={{
          width: "100%", height: 300, borderRadius: 20, background: "#f5f5f7",
          position: "relative", overflow: "hidden", marginBottom: 24,
        }}
      >
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photoIdx]}
              alt={`사진 ${photoIdx + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%",
                    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevronLeft size={18} strokeWidth={2.5} style={{ color: "#1d1d1f" }} />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%",
                    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevronRight size={18} strokeWidth={2.5} style={{ color: "#1d1d1f" }} />
                </button>
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      style={{
                        width: 6, height: 6, borderRadius: "50%", border: "none", cursor: "pointer",
                        background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.5)",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={48} strokeWidth={1.2} style={{ color: "#c7c7cc" }} />
          </div>
        )}

        {/* 배지 */}
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
          <span
            style={{
              padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
              background: listing.listingType === "JEONSE" ? "rgba(0,113,227,0.9)" : "rgba(100,60,180,0.9)",
              color: "#fff",
            }}
          >
            {TYPE_LABEL[listing.listingType]}
          </span>
          <span
            style={{
              padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
              background: "rgba(0,0,0,0.45)", color: "#fff",
            }}
          >
            {STATUS_LABEL[listing.status] ?? listing.status}
          </span>
        </div>
        {listing.analysisId && (
          <span
            style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(52,199,89,0.9)", color: "#fff",
              borderRadius: 100, padding: "3px 10px",
              fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <FileCheck2 size={11} strokeWidth={2} />AI분석 첨부
          </span>
        )}
      </div>

      {/* 핵심 정보 */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 20, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 28, fontWeight: 900, color: "#1d1d1f", letterSpacing: "-0.03em", marginBottom: 4 }}>
              {formatWon(listing.deposit)}
              {listing.listingType === "JEONSE" && listing.duration && (
                <span style={{ fontSize: 14, fontWeight: 500, color: "#6e6e73", marginLeft: 8 }}>
                  {listing.duration}개월
                </span>
              )}
            </p>
            <p style={{ fontSize: 15, color: "#3d3d3f", fontWeight: 500 }}>{listing.address}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#aeaeb2", fontSize: 12 }}>
            <Eye size={12} strokeWidth={1.5} />{listing.viewCount}
          </div>
        </div>

        {/* 속성 칩 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {listing.roomType && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6e6e73", background: "#f5f5f7", borderRadius: 8, padding: "5px 10px" }}>
              <Building2 size={12} strokeWidth={1.5} />{listing.roomType}
            </span>
          )}
          {listing.size && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6e6e73", background: "#f5f5f7", borderRadius: 8, padding: "5px 10px" }}>
              <AreaChart size={12} strokeWidth={1.5} />{listing.size}㎡
            </span>
          )}
          {listing.floor && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6e6e73", background: "#f5f5f7", borderRadius: 8, padding: "5px 10px" }}>
              <Layers size={12} strokeWidth={1.5} />{listing.floor}층
            </span>
          )}
          {listing.availableFrom && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6e6e73", background: "#f5f5f7", borderRadius: 8, padding: "5px 10px" }}>
              <Calendar size={12} strokeWidth={1.5} />
              {new Date(listing.availableFrom).toLocaleDateString("ko-KR")} 입주
            </span>
          )}
          {listing.managementFee && (
            <span style={{ fontSize: 12, color: "#6e6e73", background: "#f5f5f7", borderRadius: 8, padding: "5px 10px" }}>
              관리비 {formatWon(listing.managementFee)}/월
            </span>
          )}
        </div>
      </div>

      {/* 등록자 */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "#aeaeb2", marginBottom: 2 }}>등록인</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>
            {listing.owner.companyName ?? listing.owner.name ?? ""}
          </p>
        </div>
        <span style={{ fontSize: 11, color: "#aeaeb2" }}>
          {new Date(listing.createdAt).toLocaleDateString("ko-KR")} 등록
        </span>
      </div>

      {/* 설명 */}
      {listing.description && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#1d1d1f", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {listing.description}
          </p>
        </div>
      )}

      {/* 계약 의향서 버튼 */}
      {canApply && (
        <div style={{ position: "sticky", bottom: 20, marginTop: 24 }}>
          {applicationSent ? (
            <div
              style={{
                background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.3)",
                borderRadius: 16, padding: "16px 20px", textAlign: "center",
                fontSize: 14, fontWeight: 600, color: "#1a9e45",
              }}
            >
              계약의향서를 전달했습니다. 임대인의 결정을 기다려주세요.
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 16,
                background: "#0071e3", color: "#fff",
                fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(0,113,227,0.3)",
              }}
            >
              <FileText size={17} strokeWidth={2} />계약 의향서 보내기
            </button>
          )}
        </div>
      )}

      {showModal && (
        <ApplicationModal
          listingId={listing.id}
          deposit={listing.deposit}
          listingType={listing.listingType}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setApplicationSent(true); }}
        />
      )}
    </div>
  );
}
