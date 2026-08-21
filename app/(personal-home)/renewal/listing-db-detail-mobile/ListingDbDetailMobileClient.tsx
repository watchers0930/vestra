"use client";

/**
 * 모바일 전용 등록매물(DB) 상세.
 * 목업(vestra-sub-listing-m.html) 스타일(listing-detail-mobile.module.css 재사용)로
 * DB 매물 데이터(사진 갤러리·안심인증 서류·설명)를 표시한다.
 * 위치/인프라/학군/시세 탭은 좌표가 있으면 MobileDetailTabs 재사용.
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import s from "../listing-detail-mobile/listing-detail-mobile.module.css";
import { GANGNAM_TEST_LISTINGS } from "../listings-list/test-fixtures";
import { ApplicationModal } from "@/app/(app)/listings/[id]/components/ApplicationModal";
import RenewalLoginModal from "../_shared/RenewalLoginModal";
import MobileDetailTabs from "../listing-detail-mobile/components/MobileDetailTabs";
import type { ListingItem } from "@/app/(app)/listings/hooks/useListings";

function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

/** 주소 문자열에서 시/군/구·동·단지명 추출 (탭 검색·시세 라벨용) */
function parseAddr(address: string): { region: string; dong: string; aptName: string } {
  const parts = (address || "").trim().split(/\s+/);
  // 시/도(첫 토큰)는 제외하고 시군구(구/군, 또는 성남시 분당구 같은 시) 우선
  const region = parts.find((p) => p.endsWith("구") || p.endsWith("군") || (p.endsWith("시") && p !== parts[0])) ?? "";
  const dong = parts.find((p) => /(동|가|읍|면)$/.test(p)) ?? "";
  const aptName = parts[parts.length - 1] ?? address;
  return { region, dong, aptName };
}

const centerBox: React.CSSProperties = { padding: "80px 20px", textAlign: "center", color: "#64748b", fontSize: 14 };

export default function ListingDbDetailMobileClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { status } = useSession();
  const id = sp.get("id") || "";

  const [listing, setListing] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(!id);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showIntent, setShowIntent] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!id) return;
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

  const handleIntent = () => {
    if (status !== "authenticated") { setShowLogin(true); return; }
    setShowIntent(true);
  };

  if (loading) {
    return <div className={s.pageRoot}><div style={centerBox}>불러오는 중...</div></div>;
  }
  if (notFound || !listing) {
    return (
      <div className={s.pageRoot}>
        <div style={centerBox}>
          매물을 찾을 수 없습니다.
          <div style={{ marginTop: 16 }}>
            <button className={s.ctaSecondary} style={{ padding: "10px 18px" }} onClick={() => router.push("/renewal/listings-list")}>매물 목록으로</button>
          </div>
        </div>
      </div>
    );
  }

  const isJeonse = listing.listingType === "JEONSE";
  const priceNum = Number(listing.deposit || 0);
  const photos = listing.photos ?? [];
  const ownerName = listing.owner?.companyName || listing.owner?.name || "등록자";
  const { region, dong, aptName } = parseAddr(listing.address);
  const lat = listing.latitude;
  const lng = listing.longitude;
  // 매물 설명 — 실제 등록 설명이 있으면 사용, 없으면(테스트 샘플 포함) 데이터 기반 생성
  const priceLabel = isJeonse ? `전세 보증금 ${formatKoreanWon(priceNum)}` : `매매가 ${formatKoreanWon(priceNum)}`;
  const floorText = listing.floor != null ? `${listing.floor}층${listing.totalFloor ? `/${listing.totalFloor}층` : ""}` : null;
  const certText = listing.isCertified
    ? "등기사항전부증명서·건축물대장·재산세납부확인서 3종 서류가 확인된 베스트라 안심인증 매물입니다."
    : "계약 전 AI 권리분석으로 권리관계와 안전성을 확인하시길 권장합니다.";
  const descText = listing.description && !listing.description.includes("테스트")
    ? listing.description
    : [
        `${region} ${dong}에 위치한 ${aptName} ${listing.roomType ?? "매물"}입니다.`,
        `전용 ${listing.size ?? "-"}㎡${floorText ? `, ${floorText}` : ""}, ${priceLabel}.`,
        certText,
        "주변 교통·학군·생활 인프라와 국토부 실거래 시세는 아래 위치·인프라·학군·시세 탭에서 확인하실 수 있습니다.",
      ].join(" ");

  return (
    <div className={s.pageRoot}>
      {/* STICKY NAV */}
      <nav className={s.mNav}>
        <button className={s.mNavBack} onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={s.mNavTitle}>매물상세</span>
        <button className={s.mNavShare} aria-label="공유">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </nav>

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroInner}>
          <p className={s.subHeroText}>
            베스트라의 매물은 안심인증등록제로 운영되어<br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      <div className={s.mContent}>
        {/* 사진 갤러리 */}
        <div className={s.photoGallery}>
          {photos.length > 0 ? (
            <div className={s.photoMain} style={{ backgroundImage: `url(${photos[photoIdx]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          ) : (
            <div className={s.photoMain} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "#f1f5f9", color: "#64748b" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500 }}>등록된 사진이 없습니다</span>
            </div>
          )}
          <div className={s.photoBadgeRow}>
            <span className={s.photoBadge} style={{ background: isJeonse ? "#2e4bd8" : "#e04444" }}>{isJeonse ? "전세" : "매매"}</span>
            {listing.isCertified && <span className={`${s.photoBadge} ${s.pbStatus}`}>안심인증</span>}
            {listing.isRentalBusiness && <span className={`${s.photoBadge} ${s.pbStatus}`}>등록임대주택</span>}
          </div>
          {photos.length > 1 && <span className={s.photoCounter}>{photoIdx + 1} / {photos.length}</span>}
        </div>
        {photos.length > 1 && (
          <div className={s.photoThumbs}>
            {photos.map((p, i) => (
              <div key={i} className={`${s.photoThumb} ${i === photoIdx ? s.active : ""}`} onClick={() => setPhotoIdx(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt={`사진 ${i + 1}`} />
              </div>
            ))}
          </div>
        )}

        {/* 매물 정보 카드 */}
        <div className={s.propCard}>
          <div className={s.propCardHeader}>
            {listing.isCertified && <div className={s.listingTrustTag}>안심매물</div>}
            <h1 className={s.listingName}>{listing.address}</h1>
            <div className={s.listingPrice}>{formatKoreanWon(priceNum)}</div>
            <span className={s.listingTypeBadge} style={{ background: isJeonse ? "#2e4bd8" : "#e04444" }}>{isJeonse ? "전세" : "매매"}</span>
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

              {/* 등기부 확인 결과 — 부기등기(등록임대주택·명의변경) */}
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
              <div className={s.certHeader}><span className={s.certTitle}>안심인증 미완료 매물</span></div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.5 }}>
                등기·건축물대장·재산세 서류가 아직 확인되지 않았습니다. 계약 전 권리분석을 권장합니다.
              </p>
            </div>
          )}

          <div className={s.descSection}>
            <div className={s.descLabel}>매물 설명</div>
            <p className={s.descText}>{descText}</p>
          </div>
        </div>

        {/* 위치/인프라/학군/시세 — 좌표 있으면 탭 표시 */}
        {lat != null && lng != null && (
          <MobileDetailTabs region={region} dong={dong} aptName={aptName} lat={lat} lng={lng} />
        )}
      </div>

      {/* STICKY CTA */}
      <div className={s.stickyCta}>
        <button className={s.ctaPrimary} onClick={handleIntent}>의향서 보내기</button>
        <button className={s.ctaSecondary} onClick={() => router.push("/renewal/rights")}>AI 권리분석<br />해보기</button>
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
    </div>
  );
}
