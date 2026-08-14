"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import type { OfficialPriceResult } from "@/lib/official-price-api";
import s from "./official-price.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import OfficialPriceFooter from "./components/OfficialPriceFooter";

/** 결과에서 보유세 계산에 적합한 공시가격 추출 */
function getBestPrice(result: OfficialPriceResult): number {
  if (result.aptPrice?.price) return result.aptPrice.price;
  if (result.housePrice?.price) return result.housePrice.price;
  if (result.landPrice?.totalPrice) return result.landPrice.totalPrice;
  return 0;
}

export default function OfficialPriceClient() {
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OfficialPriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 기존 (app)/official-price/page.tsx 의 조회 로직과 동일한 방식 (GET /api/official-price)
  const handleSearch = useCallback(async () => {
    const query = address.trim();
    if (query.length < 3) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/official-price?address=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "조회에 실패했습니다");
        return;
      }

      setSelectedAddress(json.address || query);
      setResult(json);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <>
      <RenewalGnb active="official-price" />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Official Price Lookup</span>
          <h1>공시가격 조회</h1>
          <p className={s.subHeroSub}>개별공시지가 · 공동주택가격 · 개별주택가격 통합 조회</p>
        </div>
      </section>

      {/* PAGE */}
      <div className={s.pageWrap}>
        <p className={s.secEyebrow}>Official Price</p>
        <h2 className={s.secTitle}>지번 주소로 공시가격을 조회하세요</h2>
        <p className={s.secDesc}>
          국토교통부·VWorld 공시가격 데이터를 기반으로 공동주택가격, 개별주택가격, 개별공시지가를
          한 번에 확인할 수 있습니다.
        </p>

        {/* SEARCH */}
        <div className={s.searchCard}>
          <div className={s.searchRow}>
            <input
              className={s.searchInput}
              type="text"
              placeholder="지번 주소 입력 (예: 서울 강남구 역삼동 123-4)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className={s.searchBtn}
              onClick={handleSearch}
              disabled={loading || address.trim().length < 3}
            >
              {loading ? (
                <svg className={s.searchSpin} viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
              조회
            </button>
          </div>
          {selectedAddress && (
            <div className={s.searchSelected}>
              <svg viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <b>{selectedAddress}</b> · 선택된 주소
            </div>
          )}
        </div>

        {/* ERROR */}
        {error && <div className={s.errorBox}>{error}</div>}

        {/* RESULT */}
        {result && (
          <>
            {/* RESULT META */}
            <div className={s.resultMeta}>
              <div>
                <div className={s.rmYear}>기준연도 {result.year}년</div>
                <div className={s.rmAddr}>{result.address}</div>
              </div>
              {result.pnu && <div className={s.rmPnu}>PNU {result.pnu}</div>}
            </div>

            {/* PRICE CARDS */}
            <div className={s.priceGrid}>
              {/* 공동주택 공시가격 */}
              <PriceCard
                tone="blue"
                title="공동주택 공시가격"
                sub="아파트 · 연립 · 다세대"
                icon={
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="9" y1="6" x2="9" y2="6" /><line x1="15" y1="6" x2="15" y2="6" />
                    <line x1="9" y1="10" x2="9" y2="10" /><line x1="15" y1="10" x2="15" y2="10" />
                    <line x1="9" y1="14" x2="9" y2="14" /><line x1="15" y1="14" x2="15" y2="14" />
                    <path d="M10 22v-4h4v4" />
                  </svg>
                }
                price={result.aptPrice?.price ?? null}
                rows={result.aptPrice ? [
                  { lbl: "단지명", val: result.aptPrice.complexName || "-" },
                  { lbl: "전용면적", val: result.aptPrice.area ? `${result.aptPrice.area}㎡` : "-" },
                  { lbl: "동 / 호", val: [result.aptPrice.dong, result.aptPrice.ho].filter(Boolean).join(" ") || "-" },
                ] : []}
                note={result.aptPrice?.matched === false
                  ? "입력하신 동/호를 찾지 못해 단지 대표 세대의 공시가격을 표시합니다. 정확한 세대를 조회하려면 주소에 동·호를 포함해 입력해 주세요."
                  : undefined}
              />

              {/* 개별주택 공시가격 */}
              <PriceCard
                tone="green"
                title="개별주택 공시가격"
                sub="단독주택 · 다가구"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                }
                price={result.housePrice?.price ?? null}
                rows={result.housePrice ? [
                  { lbl: "대지면적", val: result.housePrice.area ? `${result.housePrice.area}㎡` : "-" },
                  { lbl: "건물면적", val: result.housePrice.buildingArea ? `${result.housePrice.buildingArea}㎡` : "-" },
                ] : []}
              />

              {/* 개별공시지가 */}
              <PriceCard
                tone="amber"
                title="개별공시지가"
                sub="토지 (㎡당)"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" />
                    <path d="M9 9h.01" /><path d="M15 9h.01" />
                    <path d="M9 13h.01" /><path d="M15 13h.01" />
                  </svg>
                }
                price={result.landPrice?.price ?? null}
                priceLabel={result.landPrice?.price ? `${result.landPrice.price.toLocaleString()}원/㎡` : undefined}
                rows={result.landPrice ? [
                  { lbl: "토지면적", val: result.landPrice.area ? `${result.landPrice.area}㎡` : "-" },
                  { lbl: "토지 총액", val: result.landPrice.totalPrice ? formatKRW(result.landPrice.totalPrice) : "-" },
                  { lbl: "용도지역", val: result.landPrice.landUse || "-" },
                ] : []}
              />
            </div>

            {/* TAX SHORTCUT */}
            <div className={s.taxCta}>
              <div>
                <div className={s.taxCtaT}>보유세 계산에 활용하기</div>
                <div className={s.taxCtaD}>조회된 공시가격으로 재산세·종합부동산세를 바로 계산할 수 있습니다.</div>
              </div>
              <Link href={`/renewal/tax?tab=holding&assessed=${getBestPrice(result)}`} className={s.taxCtaBtn}>
                세금계산 바로가기
                <svg viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            </div>

            {/* NOTICE */}
            <div className={s.notice}>
              <span className={s.noticeIco}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <div className={s.noticeBody}>
                <strong>안내 · 참고용 정보</strong>
                본 조회 결과는 국토교통부 공시가격 알리미 및 VWorld 공시가격 데이터 기반 <b>참고용</b> 정보이며{" "}
                <b>법적 효력이 없습니다</b>. 실제 과세 기준 및 정확한 공시가격은 부동산공시가격 알리미(
                <a href="https://www.realtyprice.kr" target="_blank" rel="noreferrer">realtyprice.kr</a>)에서 확인하시기 바랍니다.
              </div>
            </div>
          </>
        )}
      </div>

      {/* INFO: 3 지표 설명 */}
      <div className={s.infoSec}>
        <div className={s.infoGrid}>
          <div className={s.icard}>
            <div className={s.icardLabel}>Apartment</div>
            <div className={s.icardVal}>공동주택 공시가격</div>
            <div className={s.icardDesc}>아파트·연립·다세대주택의 개별 세대 단위로 공시되는 가격입니다. 재산세·종부세 등 보유세 과세표준의 기준이 됩니다.</div>
          </div>
          <div className={s.icard}>
            <div className={s.icardLabel}>House</div>
            <div className={s.icardVal}>개별주택가격</div>
            <div className={s.icardDesc}>단독주택·다가구주택의 토지와 건물을 합산해 공시되는 가격입니다. 표준주택가격을 기준으로 지자체가 산정·공시합니다.</div>
          </div>
          <div className={s.icard}>
            <div className={s.icardLabel}>Land</div>
            <div className={s.icardVal}>개별공시지가</div>
            <div className={s.icardDesc}>토지 1㎡당 공시되는 가격으로, 각종 토지 관련 세금과 부담금의 산정 기준으로 활용됩니다. 매년 1월 1일 기준 공시됩니다.</div>
          </div>
        </div>
      </div>

      <OfficialPriceFooter />
    </>
  );
}

// ── 가격 카드 컴포넌트 ──

function PriceCard({ tone, title, sub, icon, price, priceLabel, rows, note }: {
  tone: "blue" | "green" | "amber";
  title: string;
  sub: string;
  icon: React.ReactNode;
  price: number | null;
  priceLabel?: string;
  rows: { lbl: string; val: string }[];
  note?: string;
}) {
  const hasData = price !== null && price > 0;

  return (
    <div className={`${s.priceCard} ${!hasData ? s.priceCardEmpty : ""}`}>
      <div className={s.pcHead}>
        <div className={`${s.pcIco} ${s[tone]}`}>{icon}</div>
        <div>
          <div className={s.pcTitle}>{title}</div>
          <div className={s.pcSub}>{sub}</div>
        </div>
      </div>
      {hasData ? (
        <>
          <div className={`${s.pcPrice} ${s[tone]}`}>{priceLabel ?? formatKRW(price)}</div>
          <div className={s.pcRows}>
            {rows.map((r) => (
              <div className={s.pcRow} key={r.lbl}>
                <span className={s.lbl}>{r.lbl}</span>
                <span className={s.val}>{r.val}</span>
              </div>
            ))}
          </div>
          {note && <p className={s.pcNote}>{note}</p>}
        </>
      ) : (
        <p className={s.pcEmpty}>데이터 없음</p>
      )}
    </div>
  );
}
