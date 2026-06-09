"use client";

import { useState, useCallback } from "react";
import { Search, Landmark, Building2, Home, MapPin, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { InfoRow } from "@/components/results";
import AddressAutocomplete, { type AddressResult } from "@/components/common/AddressAutocomplete";
import type { OfficialPriceResult } from "@/lib/official-price-api";

export default function OfficialPricePage() {
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OfficialPriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (addr?: string) => {
    const query = addr || selectedAddress || address;
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

      setResult(json);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [address, selectedAddress]);

  const handleSelect = useCallback((item: AddressResult) => {
    const addr = item.address || item.roadAddress;
    setSelectedAddress(addr);
    setResult(null);
    setError(null);
    // 선택 후 자동 조회
    setTimeout(() => handleSearch(addr), 100);
  }, [handleSearch]);

  const cardStyle = {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    padding: "24px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingTop: "52px" }}>
      <DashboardPageTopbar current="공시가격 조회" primaryHref="/tax" primaryLabel="세금계산" />
      <CategoryHero
        badge="✨ 공시가격 조회"
        title="공시가격 조회"
        description="개별공시지가 · 공동주택가격 · 개별주택가격 통합 조회"
        marginBottom="20px"
      />

      {/* 검색 영역 */}
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={handleSelect}
            onSubmit={() => handleSearch()}
            placeholder="지번 주소 입력 (예: 서울 강남구 역삼동 123-4)"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || address.length < 3}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
              background: loading ? "#ccc" : "#0071e3", color: "#fff", border: "none",
              cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            조회
          </button>
        </div>
        {selectedAddress && (
          <p style={{ fontSize: "12px", color: "#6e6e73", marginTop: "8px", marginBottom: 0 }}>
            <MapPin size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: "4px" }} />
            {selectedAddress}
          </p>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 기준 정보 */}
          <div style={{ ...cardStyle, padding: "16px 20px", background: "linear-gradient(148deg, #0c1527, #141820)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", margin: "0 0 4px" }}>기준연도 {result.year}년</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", margin: 0 }}>{result.address}</p>
              </div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0, fontFamily: "monospace" }}>PNU {result.pnu}</p>
            </div>
          </div>

          {/* 공시가격 카드들 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {/* 공동주택가격 */}
            <PriceCard
              icon={Building2}
              title="공동주택 공시가격"
              subtitle="아파트 · 연립주택"
              color="#0071e3"
              price={result.aptPrice?.price ?? null}
              rows={result.aptPrice ? [
                { label: "단지명", value: result.aptPrice.complexName || "-" },
                { label: "전용면적", value: result.aptPrice.area ? `${result.aptPrice.area}㎡` : "-" },
                { label: "동/호", value: [result.aptPrice.dong, result.aptPrice.ho].filter(Boolean).join(" ") || "-" },
              ] : []}
            />

            {/* 개별주택가격 */}
            <PriceCard
              icon={Home}
              title="개별주택 공시가격"
              subtitle="단독주택 · 다가구"
              color="#10b981"
              price={result.housePrice?.price ?? null}
              rows={result.housePrice ? [
                { label: "대지면적", value: result.housePrice.area ? `${result.housePrice.area}㎡` : "-" },
                { label: "건물면적", value: result.housePrice.buildingArea ? `${result.housePrice.buildingArea}㎡` : "-" },
              ] : []}
            />

            {/* 개별공시지가 */}
            <PriceCard
              icon={Landmark}
              title="개별공시지가"
              subtitle="토지"
              color="#f59e0b"
              price={result.landPrice?.totalPrice ?? null}
              rows={result.landPrice ? [
                { label: "㎡당 공시지가", value: formatKRW(result.landPrice.price) },
                { label: "면적", value: result.landPrice.area ? `${result.landPrice.area}㎡` : "-" },
                { label: "용도지역", value: result.landPrice.landUse || "-" },
              ] : []}
            />
          </div>

          {/* 세금계산 바로가기 */}
          <div style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f", margin: "0 0 2px" }}>보유세 계산에 활용하기</p>
              <p style={{ fontSize: "12px", color: "#6e6e73", margin: 0 }}>조회된 공시가격으로 보유세를 바로 계산할 수 있습니다</p>
            </div>
            <Link
              href={`/tax?tab=holding&assessed=${getBestPrice(result)}`}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 600,
                background: "#0071e3", color: "#fff", textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              세금계산 <ExternalLink size={12} />
            </Link>
          </div>

          {/* 안내문 */}
          <div style={{ padding: "14px 18px", borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
            <p style={{ fontSize: "12px", color: "#92400e", margin: 0, lineHeight: 1.8 }}>
              <strong>안내</strong><br />
              공시가격은 국토교통부 공시가격 알리미(data.go.kr) 데이터 기반이며, 실제 과세 기준과 다를 수 있습니다.
              정확한 공시가격은 부동산공시가격 알리미(realtyprice.kr)에서 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 가격 카드 컴포넌트 ──

function PriceCard({ icon: Icon, title, subtitle, color, price, rows }: {
  icon: typeof Building2;
  title: string;
  subtitle: string;
  color: string;
  price: number | null;
  rows: { label: string; value: string }[];
}) {
  const hasData = price !== null && price > 0;

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "20px",
      opacity: hasData ? 1 : 0.5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{title}</p>
          <p style={{ fontSize: "11px", color: "#6e6e73", margin: 0 }}>{subtitle}</p>
        </div>
      </div>

      {hasData ? (
        <>
          <p style={{ fontSize: "24px", fontWeight: 700, color, margin: "0 0 12px" }}>
            {formatKRW(price)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {rows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: "13px", color: "#aeaeb2", margin: 0 }}>데이터 없음</p>
      )}
    </div>
  );
}

/** 결과에서 보유세 계산에 적합한 공시가격 추출 */
function getBestPrice(result: OfficialPriceResult): number {
  if (result.aptPrice?.price) return result.aptPrice.price;
  if (result.housePrice?.price) return result.housePrice.price;
  if (result.landPrice?.totalPrice) return result.landPrice.totalPrice;
  return 0;
}
