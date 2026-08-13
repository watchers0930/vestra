"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./listing-detail.module.css";
import DetailTabs from "./DetailTabs";

const PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&auto=format&fit=crop&q=80",
];

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

  const [activePhoto, setActivePhoto] = useState(0);
  const [info, setInfo] = useState<AptInfo | null>(null);

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
              <img className={s.photoMain} src={PHOTOS[activePhoto]} alt={`${aptName} 사진 ${activePhoto + 1}`} />
              <div className={s.photoBadgeRow}>
                <span className={`${s.photoBadge} ${s.pbSale}`}>매매</span>
                <span className={`${s.photoBadge} ${s.pbStatus}`}>국토부 실거래</span>
              </div>
              <span className={s.photoCounter}>{activePhoto + 1} / {PHOTOS.length}</span>
            </div>
            <div className={s.photoThumbs}>
              {PHOTOS.map((p, i) => (
                <div key={i} className={`${s.photoThumb} ${activePhoto === i ? s.active : ""}`} onClick={() => setActivePhoto(i)}>
                  <img src={p.replace("w=900", "w=200")} alt={`썸네일 ${i + 1}`} />
                </div>
              ))}
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
                <span className={s.certTitle}>안전인증 완료</span>
              </div>
              <p style={{ fontSize: 12, color: "#16a34a", margin: "0 0 12px", lineHeight: 1.5 }}>
                베스트라는 아래 3종 서류를 확인해 안심 거래를 보증합니다.
              </p>
              <div className={s.certItems}>
                <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>등기사항전부증명서</span><span className={s.certItemStatus}>권리관계 확인 완료</span></div>
                <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>건축물대장</span><span className={s.certItemStatus}>건물 정보 확인 완료</span></div>
                <div className={s.certItem}><div className={s.certDot}></div><span className={s.certItemLabel}>재산세납부확인서</span><span className={s.certItemStatus}>납세 이력 확인 완료</span></div>
              </div>
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
              <button className={s.ctaPrimary} onClick={() => router.push("/login")}>의향서 보내기</button>
              <button className={s.ctaSecondary} onClick={() => router.push("/rights")}>AI 권리분석 해보기</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
