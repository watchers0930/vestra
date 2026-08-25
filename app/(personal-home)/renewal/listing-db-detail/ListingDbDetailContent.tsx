"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import s from "../listing-detail/listing-detail.module.css";
import DetailTabs from "../listing-detail/DetailTabs";
import PhotoSlider from "./PhotoSlider";
import { ApplicationModal } from "@/app/(app)/listings/[id]/components/ApplicationModal";
import RenewalLoginModal from "../_shared/RenewalLoginModal";
import { GANGNAM_TEST_LISTINGS } from "../listings-list/test-fixtures";
import { SAMPLE_INTERIOR_PHOTOS } from "@/lib/sample-photos";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";

function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

// 주소 문자열에서 위치·인프라·학군·시세 탭에 넘길 시군구/법정동/단지명 추출
// 예: "서울시 강남구 대치동 966 대치아이파크" → { region: "강남구", dong: "대치동", apt: "대치아이파크" }
function parseAddress(address: string): { region: string; dong: string; apt: string } {
  const parts = (address || "").split(/\s+/).filter(Boolean);
  const region = parts.find((p) => p.endsWith("구") || (p.endsWith("시") && p !== parts[0])) || "";
  const dong = parts.find((p) => p.endsWith("동") || p.endsWith("읍") || p.endsWith("면")) || "";
  const jibunIdx = parts.findIndex((p) => /^\d+(-\d+)?$/.test(p));
  const apt = (jibunIdx >= 0 ? parts.slice(jibunIdx + 1).join(" ") : parts[parts.length - 1]) || "";
  return { region, dong, apt };
}

const centerBox: React.CSSProperties = { padding: "80px 20px", textAlign: "center", color: "#64748b", fontSize: 14 };

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
    // 테스트 샘플 매물(실데이터 없을 때 노출)은 DB 조회 없이 fixture로 표시
    const fixture = GANGNAM_TEST_LISTINGS.find((l) => l.id === id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fixture) { setListing(fixture); setLoading(false); return; }
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
  // 국토부 상세보기(listing-detail)와 동일하게 위치·인프라·학군·시세 탭 노출용 파생값
  const { region, dong, apt } = parseAddress(listing.address);
  const lat = listing.latitude ?? null;
  const lng = listing.longitude ?? null;
  // 등록 사진이 없으면 임의 실내 예시 이미지로 슬라이더 노출
  const gallery = photos.length > 0 ? photos : SAMPLE_INTERIOR_PHOTOS;
  const usingSamplePhotos = photos.length === 0;

  // 매물 설명 — 실제 등록 설명이 있으면 사용, 없으면(테스트 샘플 포함) 데이터 기반으로 생성
  const priceLabel = isJeonse ? `전세 보증금 ${formatKoreanWon(priceNum)}` : `매매가 ${formatKoreanWon(priceNum)}`;
  const floorText = listing.floor != null ? `${listing.floor}층${listing.totalFloor ? `/${listing.totalFloor}층` : ""}` : null;
  const certText = listing.isCertified
    ? "등기사항전부증명서·건축물대장·재산세납부확인서 3종 서류가 확인된 베스트라 안심인증 매물입니다."
    : "계약 전 AI 권리분석으로 권리관계와 안전성을 확인하시길 권장합니다.";
  const generatedDesc = [
    `${region} ${dong}에 위치한 ${apt} ${listing.roomType ?? "매물"}입니다.`,
    `전용 ${listing.size ?? "-"}㎡${floorText ? `, ${floorText}` : ""}, ${priceLabel}.`,
    certText,
    "주변 교통·학군·생활 인프라와 국토부 실거래 시세는 아래 위치·인프라·학군·시세 탭에서 확인하실 수 있습니다.",
  ].join(" ");
  const descText = listing.description && !listing.description.includes("테스트") ? listing.description : generatedDesc;

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
            <div className={s.photoGallery} style={{ position: "relative" }}>
              <PhotoSlider photos={gallery} minHeight={300} />
              {usingSamplePhotos && (
                <span style={{ position: "absolute", top: 12, right: 12, zIndex: 2, background: "rgba(15,37,71,.85)", color: "#fff", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8 }}>
                  예시 실내 이미지 · 안심인증 등록 시 실제 사진으로 대체됩니다
                </span>
              )}
              <div className={s.photoBadgeRow}>
                <span className={`${s.photoBadge} ${isJeonse ? "" : s.pbSale}`}>{isJeonse ? "전세" : "매매"}</span>
                {listing.isCertified && <span className={`${s.photoBadge} ${s.pbStatus}`}>안심인증</span>}
                {listing.isRentalBusiness && <span className={`${s.photoBadge} ${s.pbStatus}`}>등록임대주택</span>}
              </div>
            </div>

            {/* 위치·인프라·학군·시세 — 국토부 상세보기와 동일 구성(DetailTabs 재사용) */}
            <DetailTabs region={region} dong={dong} aptName={apt} lat={lat} lng={lng} />
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
            {listing.isCertified ? (
              <div className={s.certSection}>
                <div className={s.certHeader}>
                  <div className={s.certCheck}>
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <span className={s.certTitle}>안심인증 3종 서류 기준</span>
                </div>
                <p style={{ fontSize: 12, color: "#16a34a", margin: "0 0 12px", lineHeight: 1.5 }}>
                  안심인증 매물로 등록되면 아래 3종 서류를 확인해 안심 거래를 보증합니다.
                </p>
                {listing.safetyDocuments && listing.safetyDocuments.length > 0 ? (
                  <div className={s.certItems}>
                    {listing.safetyDocuments.map((doc, i) => (
                      <div key={i} className={s.certItem}>
                        <div className={s.certDot}></div>
                        <span className={s.certItemLabel}>{doc.type || doc.filename}</span>
                        <span className={s.certItemStatus}>확인 완료</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={s.certItems}>
                    <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>등기사항전부증명서</span><span className={s.certItemStatus}>권리관계 확인</span></div>
                    <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>건축물대장</span><span className={s.certItemStatus}>건물 정보 확인</span></div>
                    <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>재산세납부확인서</span><span className={s.certItemStatus}>납세 이력 확인</span></div>
                  </div>
                )}

                {/* 등기부 확인 결과 — 부기등기 (등기사항전부증명서 분석) */}
                {(listing.isRentalBusiness || listing.hasNameChange) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5efe8", display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>등기부 확인 결과</span>
                    {listing.isRentalBusiness && (
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>등록임대주택 (임대사업자)</div>
                        <p style={{ fontSize: 12, color: "#166534", lineHeight: 1.5, margin: 0 }}>
                          등기부상 임대사업자 부기등기가 확인된 매물입니다. 임대료 증액 제한(5%)·임대의무기간 등 임차인 보호가 적용될 수 있습니다. 보증보험 실가입 여부는 별도 확인하세요.
                        </p>
                      </div>
                    )}
                    {listing.hasNameChange && (
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>등기명의인표시변경 이력</div>
                        <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5, margin: 0 }}>
                          등기명의인표시변경(주소·성명) 이력이 있습니다. 계약 시 현재 소유자 동일성을 신분증과 대조하세요.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={s.certSection}>
                <div className={s.certHeader}>
                  <span className={s.certTitle}>안심인증 미완료 매물</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.5 }}>
                  등기·건축물대장·재산세 서류가 아직 확인되지 않았습니다. 계약 전 권리분석을 권장합니다.
                </p>
              </div>
            )}

            <div className={s.descSection}>
              <div className={s.descLabel}>매물 설명</div>
              <p className={s.descText}>{descText}</p>
            </div>

            <div className={s.ctaSection}>
              <button className={s.ctaPrimary} onClick={handleIntent}>의향서 보내기</button>
              <button className={s.ctaSecondary} onClick={() => router.push("/renewal/rights")}>AI 권리분석 해보기</button>
              <button className={s.ctaSecondary} onClick={() => router.push(`/renewal/monitoring?address=${encodeURIComponent(listing.address)}&listingId=${listing.id}`)}>이 매물 등기감시</button>
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
