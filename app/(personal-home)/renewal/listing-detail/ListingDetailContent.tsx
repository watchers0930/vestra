"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./listing-detail.module.css";
import DetailTabs from "./DetailTabs";
import MapThumbnail from "./MapThumbnail";
import { ApplicationModal } from "@/app/(app)/listings/[id]/components/ApplicationModal";

function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

interface AptInfo {
  kapt: { households: number | null; approvalDate: string | null; heatingType: string | null; parkingTotal: number | null; corridorType: string | null; constructorName: string | null } | null;
  official: { price: number | null; year: number | null } | null;
}

export default function ListingDetailContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const region = sp.get("region") || "강남구";
  const dong = sp.get("dong") || "";
  const aptName = sp.get("apt") || "매물";
  const area = sp.get("area") || "";
  const floor = sp.get("floor") || "";
  const amount = Number(sp.get("amount") || "0");
  const dealDate = sp.get("dealDate") || "";
  const buildYear = sp.get("buildYear") || "";
  const lat = sp.get("lat") ? Number(sp.get("lat")) : null;
  const lng = sp.get("lng") ? Number(sp.get("lng")) : null;

  const [info, setInfo] = useState<AptInfo | null>(null);
  const [showIntent, setShowIntent] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams({ region, dong, apt: aptName });
    if (lat != null && lng != null) { q.set("lat", String(lat)); q.set("lng", String(lng)); }
    fetch(`/api/listings/apt-info?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d))
      .catch(() => setInfo(null));
  }, [region, dong, aptName, lat, lng]);

  const kapt = info?.kapt;
  const official = info?.official;

  return (
    <section className={s.listingSection}>
      <div className={s.listingContainer}>
        <button className={s.backBtn} onClick={() => router.back()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="9,2 4,7 9,12" />
          </svg>
          지도로
        </button>

        <div className={s.listingLayout}>
          {/* LEFT */}
          <div className={s.listingLeft}>
            <div className={s.photoGallery}>
              {lat != null && lng != null ? (
                <div className={s.photoMain} style={{ position: "relative", minHeight: 300, overflow: "hidden" }}>
                  <MapThumbnail lat={lat} lng={lng} minHeight={300} />
                  <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, background: "rgba(15,37,71,.85)", color: "#fff", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8 }}>
                    실거래 위치 · 사진은 안심인증 등록 시 제공됩니다
                  </span>
                </div>
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
                  <span style={{ fontSize: 12 }}>국토교통부 실거래 기반 매물 · 안심인증 등록 시 사진이 제공됩니다</span>
                </div>
              )}
              <div className={s.photoBadgeRow}>
                <span className={`${s.photoBadge} ${s.pbSale}`}>매매</span>
                <span className={`${s.photoBadge} ${s.pbStatus}`}>국토부 실거래</span>
              </div>
            </div>

            {/* 실데이터 탭 (위치/인프라/학군/시세) */}
            <DetailTabs region={region} dong={dong} aptName={aptName} lat={lat} lng={lng} />
          </div>

          {/* RIGHT: 매물 카드 */}
          <div className={s.listingRight}>
            <div className={s.listingCardHeader}>
              <div className={s.listingTrustTag}>안심매물</div>
              <h1 className={s.listingName}>{aptName}</h1>
              <p className={s.listingAddrText}>{region} {dong}</p>
              <div className={s.listingPrice}>{formatKoreanWon(amount)}</div>
              <span className={s.listingTypeBadge}>매매</span>
            </div>

            <div className={s.listingMeta}>
              <div className={s.metaItem}><div className={s.metaLabel}>건물유형</div><div className={s.metaValue}>아파트</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>전용면적</div><div className={s.metaValue}>{area ? `${area}㎡` : "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>층수</div><div className={s.metaValue}>{floor ? `${floor}층` : "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>준공</div><div className={s.metaValue}>{buildYear ? `${buildYear}년` : (kapt?.approvalDate ?? "-")}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>세대수</div><div className={s.metaValue}>{kapt?.households ? `${kapt.households.toLocaleString()}세대` : "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>난방</div><div className={s.metaValue}>{kapt?.heatingType ?? "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>주차</div><div className={s.metaValue}>{kapt?.parkingTotal ? `${kapt.parkingTotal.toLocaleString()}대` : "-"}</div></div>
              <div className={s.metaItem}><div className={s.metaLabel}>거래일</div><div className={s.metaValue}>{dealDate || "-"}</div></div>
            </div>

            <div className={s.listingRegistrant}>
              <div>
                <div className={s.registrantInfo}>공시가격</div>
                <div className={s.registrantName}>{official?.price ? formatKoreanWon(official.price) : "정보 없음"}</div>
              </div>
              <div className={s.registrantDate}>{official?.year ? `${official.year}년 기준` : ""}</div>
            </div>

            {/* 안전인증 (베스트라 안심거래 기준 — 3종 서류 확인) */}
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
              <div className={s.certItems}>
                <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>등기사항전부증명서</span><span className={s.certItemStatus}>권리관계 확인</span></div>
                <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>건축물대장</span><span className={s.certItemStatus}>건물 정보 확인</span></div>
                <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>재산세납부확인서</span><span className={s.certItemStatus}>납세 이력 확인</span></div>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "10px 0 0", lineHeight: 1.5 }}>
                ※ 등기사항전부증명서 확인 시 <strong style={{ color: "#16a34a" }}>등록임대주택(임대사업자)</strong> 및 <strong style={{ color: "#b45309" }}>명의변경</strong> 부기등기까지 자동 분석해 드립니다.
              </p>
            </div>

            <div className={s.descSection}>
              <div className={s.descLabel}>매물 설명</div>
              <p className={s.descText}>
                {region} {dong} {aptName} 단지의 국토교통부 실거래 정보입니다. 전용 {area || "-"}㎡, {floor || "-"}층,
                {dealDate ? ` ${dealDate} 거래가 ${formatKoreanWon(amount)}` : ""}. 주변 인프라·학군·시세는 좌측 탭에서 확인하세요.
                (사진·상세 설명은 예시이며, 안심인증 매물 등록 시 실제 정보로 대체됩니다.)
              </p>
            </div>

            <div className={s.ctaSection}>
              <button className={s.ctaPrimary} onClick={() => setShowIntent(true)}>의향서 보내기</button>
              <button className={s.ctaSecondary} onClick={() => router.push("/rights")}>AI 권리분석 해보기</button>
            </div>
          </div>
        </div>
      </div>

      {showIntent && (
        <ApplicationModal
          demoMode
          listingId=""
          deposit={String(amount)}
          listingType="SALE"
          onClose={() => setShowIntent(false)}
          onSuccess={() => {}}
        />
      )}
    </section>
  );
}
