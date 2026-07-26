"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, AreaChart, Layers, Calendar, Eye, FileCheck2,
  ChevronLeft, FileText, ShieldCheck, Edit2, Trash2, MapPin, Clock,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { ListingItem } from "../../hooks/useListings";
import { ApplicationModal } from "./ApplicationModal";
import { CertificationSection } from "./CertificationSection";
import styles from "./ListingDetail.module.css";

function formatWon(val: string | null) {
  if (!val) return "-";
  const n = Number(val);
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(n % 100_000_000 === 0 ? 0 : 1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000).toLocaleString()}만`;
  return `${n.toLocaleString()}원`;
}

function extractBuildingName(address: string): string {
  const match = address.match(/(?:\d+[-\d]*\s+)([가-힣][\가-힣\s\w]+)$/);
  return match?.[1]?.trim() ?? address;
}

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", SALE: "매매" };
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "거래중", HIDDEN: "숨김", CONTRACTED: "계약완료", COMPLETED: "거래완료",
};
interface Props { listing: ListingItem; onReload?: () => void; }

export function ListingDetail({ listing, onReload }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);

  const photos = listing.photos ?? [];
  const isOwner = session?.user?.id === listing.owner.id;
  const canApply = !!session && !isOwner && listing.status === "ACTIVE";
  const buildingName = extractBuildingName(listing.address);

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
    <div style={{ width: "100%", paddingBottom: 60 }}>

      {/* 상단 네비게이션 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#6e6e73", fontSize: 14 }}
        >
          <ChevronLeft size={18} strokeWidth={2} />목록으로
        </button>
        {isOwner && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push(`/listings/${listing.id}/edit`)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", background: "#fff", fontSize: 13, fontWeight: 600, color: "#3d3d3f", cursor: "pointer" }}>
              <Edit2 size={13} strokeWidth={2} />수정
            </button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,59,48,0.3)", background: "rgba(255,59,48,0.05)", fontSize: 13, fontWeight: 600, color: "#c0392b", cursor: deleting ? "not-allowed" : "pointer" }}>
              <Trash2 size={13} strokeWidth={2} />{deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        )}
      </div>

      {/* 2-컬럼 레이아웃: 갤러리(좌) + 정보패널(우) */}
      <div className={styles.grid}>

        {/* ── 좌: 갤러리 ── */}
        <div>
          {/* 메인 이미지 */}
          <div style={{ borderRadius: 20, overflow: "hidden", background: "#f0f0f5", position: "relative", aspectRatio: "4/3" }}>
            {photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[photoIdx]} alt={`사진 ${photoIdx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={48} strokeWidth={1.2} style={{ color: "#c7c7cc" }} />
              </div>
            )}
            {/* 유형·상태 배지 */}
            <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
              <span style={{ padding: "4px 11px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: listing.listingType === "JEONSE" ? "rgba(0,113,227,0.88)" : "rgba(100,60,180,0.88)", color: "#fff", backdropFilter: "blur(4px)" }}>
                {TYPE_LABEL[listing.listingType]}
              </span>
              <span style={{ padding: "4px 11px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.42)", color: "#fff", backdropFilter: "blur(4px)" }}>
                {STATUS_LABEL[listing.status] ?? listing.status}
              </span>
            </div>
            {listing.analysisId && (
              <span style={{ position: "absolute", top: 12, right: 12, background: "rgba(52,199,89,0.9)", color: "#fff", borderRadius: 100, padding: "4px 11px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <FileCheck2 size={11} strokeWidth={2} />AI분석 첨부
              </span>
            )}
            {photos.length > 1 && (
              <span style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(0,0,0,0.48)", color: "#fff", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                {photoIdx + 1} / {photos.length}
              </span>
            )}
          </div>

          {/* 썸네일 스트립 */}
          {photos.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
              {photos.map((url, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 12, overflow: "hidden", border: i === photoIdx ? "2.5px solid #0071e3" : "2.5px solid transparent", cursor: "pointer", padding: 0, background: "none", opacity: i === photoIdx ? 1 : 0.55, transition: "all 0.15s", boxShadow: i === photoIdx ? "0 0 0 2px rgba(0,113,227,0.18)" : "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`썸네일 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}

          {/* 설명 */}
          {listing.description && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: 22, marginTop: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#aeaeb2", marginBottom: 10, letterSpacing: "0.03em" }}>매물 설명</p>
              <p style={{ fontSize: 14, color: "#3d3d3f", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>
                {listing.description}
              </p>
            </div>
          )}

          {/* 안전인증 + 임차인 안전정보 */}
          <CertificationSection listing={listing} isOwner={isOwner} onReload={onReload} />

          {listing.isCertified && listing.listingType === "JEONSE" && !isOwner && (
            <div style={{ border: "1.5px solid rgba(34,167,94,0.25)", borderRadius: 18, padding: 20, marginTop: 12, background: "rgba(34,167,94,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <ShieldCheck size={16} strokeWidth={2} color="#22a75e" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>임차인 안전 정보</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {listing.jeonseRatio != null && (() => {
                  const r = listing.jeonseRatio!;
                  const safe = r <= 80; const warn = r > 80 && r <= 100;
                  return (
                    <div style={{ flex: 1, minWidth: 120, borderRadius: 14, padding: "14px 16px", background: safe ? "rgba(52,199,89,0.08)" : warn ? "rgba(255,149,0,0.08)" : "rgba(255,59,48,0.08)" }}>
                      <p style={{ fontSize: 10, color: "#aeaeb2", margin: "0 0 4px" }}>전세가율</p>
                      <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: 0, color: safe ? "#1a9e45" : warn ? "#b45309" : "#c0392b" }}>{r.toFixed(1)}%</p>
                      <p style={{ fontSize: 11, color: "#6e6e73", margin: "4px 0 0" }}>{safe ? "✓ 안전" : warn ? "⚠ 주의 — 80% 초과" : "✕ 위험"}</p>
                    </div>
                  );
                })()}
                {listing.insuranceResult && (() => {
                  const ins = listing.insuranceResult!;
                  const eligible = ins.hugEligible || ins.sgiEligible || ins.hfEligible;
                  return (
                    <div style={{ flex: 1, minWidth: 120, borderRadius: 14, padding: "14px 16px", background: eligible ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.06)" }}>
                      <p style={{ fontSize: 10, color: "#aeaeb2", margin: "0 0 4px" }}>전세보증보험</p>
                      <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: eligible ? "#1a9e45" : "#c0392b" }}>
                        {ins.hugEligible ? "HUG 가입 가능" : ins.sgiEligible ? "SGI 가입 가능" : ins.hfEligible ? "HF 가입 가능" : "가입 어려움"}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ── 우: sticky 정보 패널 ── */}
        <div className={styles.sticky}>
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 22, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

            {/* 조회수 */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#c7c7cc", fontSize: 12 }}>
                <Eye size={12} strokeWidth={1.5} />{listing.viewCount}
              </span>
            </div>

            {/* 안심뱃지 */}
            {listing.isCertified && (
              <div style={{ marginBottom: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 100, background: "linear-gradient(135deg, #0f6e3a 0%, #1db954 55%, #22c55e 100%)", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", boxShadow: "0 3px 14px rgba(29,185,84,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
                  <ShieldCheck size={13} strokeWidth={2.5} />안심매물
                </span>
              </div>
            )}

            {/* 아파트명 */}
            <h1 style={{ fontSize: 28, fontWeight: 400, color: "#1d1d1f", letterSpacing: "-0.025em", lineHeight: 1.2, margin: "0 0 8px" }}>
              {buildingName}
            </h1>

            {/* 주소 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 22 }}>
              <MapPin size={13} strokeWidth={1.5} style={{ color: "#aeaeb2", marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#8e8e93", fontWeight: 400, margin: 0, lineHeight: 1.5 }}>{listing.address}</p>
            </div>

            {/* 금액 */}
            <p style={{ fontSize: 24, fontWeight: 400, color: "#1d1d1f", letterSpacing: "-0.025em", margin: "0 0 6px" }}>
              {formatWon(listing.deposit)}<span style={{ fontSize: 14, color: "#8e8e93", marginLeft: 2 }}>원</span>
              {listing.listingType === "JEONSE" && listing.duration && (
                <span style={{ fontSize: 13, fontWeight: 400, color: "#aeaeb2", marginLeft: 10 }}>
                  <Clock size={11} strokeWidth={1.5} style={{ display: "inline", marginRight: 3, verticalAlign: "middle" }} />
                  {listing.duration}개월
                </span>
              )}
            </p>

            {/* 속성 칩 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18 }}>
              {listing.roomType && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 12, background: "#f7f7fa" }}>
                  <Building2 size={14} strokeWidth={1.5} style={{ color: "#6e6e73", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#3d3d3f" }}>{listing.roomType}</span>
                </div>
              )}
              {listing.size && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 12, background: "#f7f7fa" }}>
                  <AreaChart size={14} strokeWidth={1.5} style={{ color: "#6e6e73", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#3d3d3f" }}>{listing.size}㎡</span>
                </div>
              )}
              {listing.floor && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 12, background: "#f7f7fa" }}>
                  <Layers size={14} strokeWidth={1.5} style={{ color: "#6e6e73", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#3d3d3f" }}>{listing.floor}층</span>
                </div>
              )}
              {listing.availableFrom && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 12, background: "#f7f7fa" }}>
                  <Calendar size={14} strokeWidth={1.5} style={{ color: "#6e6e73", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#3d3d3f" }}>{new Date(listing.availableFrom).toLocaleDateString("ko-KR")}</span>
                </div>
              )}
              {listing.managementFee && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 12, background: "#f7f7fa", gridColumn: "span 2" }}>
                  <span style={{ fontSize: 13, color: "#3d3d3f" }}>관리비 {formatWon(listing.managementFee)}/월</span>
                </div>
              )}
            </div>

            {/* 구분선 */}
            <div style={{ height: 1, background: "#f2f2f7", margin: "22px 0" }} />

            {/* 등록인 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 11, color: "#aeaeb2", margin: "0 0 3px" }}>등록인</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>
                  {listing.owner.companyName ?? listing.owner.name ?? ""}
                </p>
              </div>
              <span style={{ fontSize: 11, color: "#c7c7cc" }}>
                {new Date(listing.createdAt).toLocaleDateString("ko-KR")} 등록
              </span>
            </div>

            {/* CTA */}
            {canApply && (
              <div style={{ marginTop: 22 }}>
                {applicationSent ? (
                  <div style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)", borderRadius: 14, padding: "15px 20px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#1a9e45" }}>
                    계약의향서를 전달했습니다
                  </div>
                ) : (
                  <button onClick={() => setShowModal(true)}
                    style={{ width: "100%", padding: "15px 0", borderRadius: 14, background: "#0071e3", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 18px rgba(0,113,227,0.28)", transition: "all 0.15s" }}>
                    <FileText size={16} strokeWidth={2} />계약 의향서 보내기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
