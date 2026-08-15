"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import s from "../listing-detail/listing-detail.module.css";
import { ApplicationModal } from "@/app/(app)/listings/[id]/components/ApplicationModal";
import RenewalLoginModal from "../_shared/RenewalLoginModal";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";

function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

const centerBox: React.CSSProperties = { padding: "80px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 };

export default function ListingDbDetailContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { status } = useSession();
  const id = sp.get("id") || "";

  const [listing, setListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(!id);
  const [showIntent, setShowIntent] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // 의향서: 로그인 필요 — 비로그인 시 로그인 모달로 유도
  const handleIntent = () => {
    if (status !== "authenticated") { setShowLogin(true); return; }
    setShowIntent(true);
  };

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/listings/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setListing(d); setLoading(false); } })
      .catch(() => { if (alive) { setNotFound(true); setLoading(false); } });
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return <section className={s.listingSection}><div className={s.listingContainer} style={centerBox}>불러오는 중...</div></section>;
  }
  if (notFound || !listing) {
    return (
      <section className={s.listingSection}>
        <div className={s.listingContainer} style={centerBox}>
          매물을 찾을 수 없습니다.
          <div style={{ marginTop: 16 }}>
            <button className={s.ctaSecondary} onClick={() => router.push("/renewal/listings-list")}>매물 목록으로</button>
          </div>
        </div>
      </section>
    );
  }

  const isJeonse = listing.listingType === "JEONSE";
  const priceNum = Number(listing.deposit || 0);
  const photos = listing.photos ?? [];
  const ownerName = listing.owner?.companyName || listing.owner?.name || "등록자";

  return (
    <section className={s.listingSection}>
      <div className={s.listingContainer}>
        <button className={s.backBtn} onClick={() => router.back()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="9,2 4,7 9,12" />
          </svg>
          목록으로
        </button>

        <div className={s.listingLayout}>
          {/* LEFT */}
          <div className={s.listingLeft}>
            <div className={s.photoGallery}>
              {photos.length > 0 ? (
                <div className={s.photoMain} style={{ backgroundImage: `url(${photos[0]})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: 300 }} />
              ) : (
                <div
                  className={s.photoMain}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 300, background: "#f1f5f9", color: "#94a3b8" }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>등록된 사진이 없습니다</span>
                </div>
              )}
              <div className={s.photoBadgeRow}>
                <span className={`${s.photoBadge} ${isJeonse ? "" : s.pbSale}`}>{isJeonse ? "전세" : "매매"}</span>
                {listing.isCertified && <span className={`${s.photoBadge} ${s.pbStatus}`}>안심인증</span>}
              </div>
            </div>

            {listing.description && (
              <div className={s.descSection}>
                <div className={s.descLabel}>매물 설명</div>
                <p className={s.descText}>{listing.description}</p>
              </div>
            )}
          </div>

          {/* RIGHT: 매물 카드 */}
          <div className={s.listingRight}>
            <div className={s.listingCardHeader}>
              {listing.isCertified && <div className={s.listingTrustTag}>안심매물</div>}
              <h1 className={s.listingName}>{listing.address}</h1>
              <div className={s.listingPrice}>{formatKoreanWon(priceNum)}</div>
              <span className={s.listingTypeBadge}>{isJeonse ? "전세" : "매매"}</span>
            </div>

            <div className={s.listingMeta}>
              <div className={s.metaItem}><div className={s.metaLabel}>건물유형</div><div className={s.metaValue}>{listing.roomType ?? "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>전용면적</div><div className={s.metaValue}>{listing.size ? `${listing.size}㎡` : "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>층수</div><div className={s.metaValue}>{listing.floor != null ? `${listing.floor}층${listing.totalFloor ? ` / ${listing.totalFloor}층` : ""}` : "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>관리비</div><div className={s.metaValue}>{listing.managementFee ? `${Number(listing.managementFee).toLocaleString()}원` : "-"}</div></div>
              {isJeonse && <div className={s.metaItem}><div className={s.metaLabel}>계약기간</div><div className={s.metaValue}>{listing.duration ? `${listing.duration}개월` : "-"}</div></div>}
              <div className={s.metaItem}><div className={s.metaLabel}>입주가능일</div><div className={s.metaValue}>{listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString("ko-KR") : "협의"}</div></div>
            </div>

            <div className={s.listingRegistrant}>
              <div>
                <div className={s.registrantInfo}>등록자</div>
                <div className={s.registrantName}>{ownerName}</div>
              </div>
              <div className={s.registrantDate}>조회 {listing.viewCount ?? 0}회 · 의향서 {listing._count?.applications ?? 0}건</div>
            </div>

            {/* 안심인증 서류 */}
            {listing.isCertified && listing.safetyDocuments && listing.safetyDocuments.length > 0 ? (
              <div className={s.certSection}>
                <div className={s.certHeader}>
                  <div className={s.certCheck}>
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <span className={s.certTitle}>안심인증 완료 ({listing.safetyDocuments.length}종 서류)</span>
                </div>
                <div className={s.certItems}>
                  {listing.safetyDocuments.map((doc, i) => (
                    <div key={i} className={s.certItem}>
                      <div className={s.certDot}></div>
                      <span className={s.certItemLabel}>{doc.type || doc.filename}</span>
                      <span className={s.certItemStatus}>확인 완료</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={s.certSection}>
                <div className={s.certHeader}>
                  <span className={s.certTitle}>안심인증 미완료 매물</span>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "8px 0 0", lineHeight: 1.5 }}>
                  등기·건축물대장·재산세 서류가 아직 확인되지 않았습니다. 계약 전 권리분석을 권장합니다.
                </p>
              </div>
            )}

            <div className={s.ctaSection}>
              <button className={s.ctaPrimary} onClick={handleIntent}>의향서 보내기</button>
              <button className={s.ctaSecondary} onClick={() => router.push("/rights")}>AI 권리분석 해보기</button>
            </div>
          </div>
        </div>
      </div>

      {showIntent && (
        <ApplicationModal
          listingId={listing.id}
          deposit={listing.deposit}
          listingType={listing.listingType}
          onClose={() => setShowIntent(false)}
          onSuccess={() => {}}
        />
      )}

      {showLogin && (
        <RenewalLoginModal
          featureName="의향서"
          description="관심 매물에 계약 의향서를 보내려면 로그인이 필요해요."
          onClose={() => setShowLogin(false)}
        />
      )}
    </section>
  );
}
