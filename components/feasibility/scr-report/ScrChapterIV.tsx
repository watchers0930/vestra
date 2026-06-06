"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrSection, EmptyDataNotice, thCls } from "./scr-shared";
import { MapPin, TrendingUp, Home } from "lucide-react";
import type {
  ScrPriceAdequacy,
  ScrLocationAnalysis,
  ScrNearbyDevelopmentRow,
  ScrSalesCase,
  ScrSupplyCase,
} from "@/lib/feasibility/scr-types";
import { RegionalTrendChart, SalesCasesTable, SupplyCasesTable } from "./ScrChapterIV-supply";
import { PremiumTable, AdequacyOpinionSection } from "./ScrChapterIV-adequacy";

type GeocoderAddressResult = { x: string; y: string };

interface ScrChapterIVProps {
  data: ScrPriceAdequacy;
  /** 사업지 주소 (위치도 지도 표시용) */
  siteAddress?: string;
}

/* ─── 표30: 입지여건 ─── */
function LocationSection({ data }: { data: ScrLocationAnalysis }) {
  const categories = [
    { label: "교통", items: data.transportation },
    { label: "생활 인프라", items: data.livingInfra },
    { label: "교육", items: data.education },
  ];

  return (
    <ScrSection icon={MapPin} title="표30. 입지여건">
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.label}>
            <p className="text-xs font-semibold text-[#6e6e73] mb-2">{cat.label}</p>
            <div className="rounded-xl bg-gray-50/80 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {cat.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100/80 last:border-0">
                      <td className="py-2 px-4 text-[#1d1d1f]">{item.item}</td>
                      <td className="py-2 px-4 text-right text-[#6e6e73]">{item.distance}</td>
                      {item.note && <td className="py-2 px-4 text-xs text-[#86868b]">{item.note}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {data.summary && (
          <p className="text-xs text-[#6e6e73] leading-relaxed mt-2">{data.summary}</p>
        )}
      </div>
    </ScrSection>
  );
}

/* ─── 표31: 인근 개발 계획 ─── */
function NearbyDevelopmentTable({ rows }: { rows: ScrNearbyDevelopmentRow[] }) {
  const impactColor: Record<string, string> = {
    "긍정": "bg-emerald-100 text-emerald-700",
    "중립": "bg-gray-100 text-gray-600",
    "부정": "bg-red-100 text-red-700",
  };

  return (
    <ScrSection icon={Home} title="표31. 인근 개발 계획">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>개발계획</th>
              <th className={cn(thCls, "text-left")}>내용</th>
              <th className={cn(thCls, "text-center")}>완료예정</th>
              <th className={cn(thCls, "text-center")}>영향</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-2 px-4 text-sm text-[#1d1d1f]">{r.planName}</td>
                <td className={cn("py-2 px-4 text-sm text-[#1d1d1f]", "text-[#6e6e73] max-w-[240px]")}>{r.description}</td>
                <td className="py-2 px-4 text-sm text-[#1d1d1f] text-center">{r.expectedCompletion || "-"}</td>
                <td className="py-2 px-4 text-sm text-[#1d1d1f] text-center">
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold", impactColor[r.impact])}>
                    {r.impact}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 그림14: 위치도 (Kakao Maps JS SDK) ─── */

interface MapMarker {
  label: string;
  address: string;
  type: "site" | "sales" | "supply";
}

function LocationMapFallback({ summary }: { summary?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <MapPin size={24} className="text-[#86868b]" />
      </div>
      <p className="text-sm font-medium text-[#6e6e73] mb-1">위치도를 표시할 수 없습니다</p>
      <p className="text-xs text-[#86868b] text-center max-w-md leading-relaxed">
        Kakao Maps API 키가 설정되지 않았거나 주소 변환에 실패했습니다.
        {summary && (
          <span className="block mt-2 text-[#6e6e73] font-medium">
            주소: {summary}
          </span>
        )}
      </p>
    </div>
  );
}

function LocationMap({
  siteAddress,
  summary,
  salesCases,
  supplyCases,
}: {
  siteAddress?: string;
  summary?: string;
  salesCases: ScrSalesCase[];
  supplyCases: ScrSupplyCase[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const hasKakaoKey = !!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    hasKakaoKey ? "loading" : "fallback"
  );

  const primaryAddress = siteAddress || summary || "";

  const markers: MapMarker[] = [];
  if (primaryAddress) {
    markers.push({ label: "사업지", address: primaryAddress, type: "site" });
  }
  salesCases.forEach((c) => {
    if (c.address) markers.push({ label: c.complexName, address: c.address, type: "sales" });
  });
  supplyCases.forEach((c) => {
    if (c.address) markers.push({ label: c.complexName, address: c.address, type: "supply" });
  });

  const geocode = useCallback(
    (
      geocoder: InstanceType<typeof window.kakao.maps.services.Geocoder>,
      address: string,
      OK: string,
    ): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        geocoder.addressSearch(address, (result: GeocoderAddressResult[], statusCode: string) => {
          if (statusCode === OK && result[0]) {
            resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
            return;
          }
          const stripped = address.replace(/\s+\d+(-\d+)?$/, "").trim();
          if (stripped !== address) {
            geocoder.addressSearch(stripped, (r2: GeocoderAddressResult[], s2: string) => {
              if (s2 === OK && r2[0]) {
                resolve({ lat: parseFloat(r2[0].y), lng: parseFloat(r2[0].x) });
              } else {
                resolve(null);
              }
            });
          } else {
            resolve(null);
          }
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!hasKakaoKey || !primaryAddress) {
      setStatus("fallback");
      return;
    }

    const initMap = async () => {
      if (!window.kakao?.maps || !mapRef.current) return;

      window.kakao.maps.load(async () => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const OK = window.kakao.maps.services.Status.OK;

        const siteCoord = await geocode(geocoder, primaryAddress, OK);
        if (!siteCoord) {
          setStatus("fallback");
          return;
        }

        const center = new window.kakao.maps.LatLng(siteCoord.lat, siteCoord.lng);
        const map = new window.kakao.maps.Map(mapRef.current!, {
          center,
          level: 5,
        });

        new window.kakao.maps.Marker({ map, position: center });

        const caseMarkers = markers.filter((m) => m.type !== "site");
        for (const marker of caseMarkers) {
          const coord = await geocode(geocoder, marker.address, OK);
          if (coord) {
            new window.kakao.maps.Marker({
              map,
              position: new window.kakao.maps.LatLng(coord.lat, coord.lng),
            });
          }
        }

        setStatus("ready");

        setTimeout(() => {
          const tiles = mapRef.current?.querySelectorAll("img");
          const hasLoadedTile = tiles && Array.from(tiles).some(
            (img) => img.naturalWidth > 0 && !img.src.includes("logo"),
          );
          if (!hasLoadedTile) setStatus("fallback");
        }, 3000);
      });
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      const timeout = setTimeout(() => {
        if (window.kakao?.maps) {
          initMap();
        } else {
          setStatus("fallback");
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryAddress, hasKakaoKey, salesCases.length, supplyCases.length]);

  if (status === "fallback") {
    return (
      <ScrSection icon={MapPin} title="그림14. 위치도">
        <LocationMapFallback summary={primaryAddress || summary} />
      </ScrSection>
    );
  }

  const hasAnyCases = salesCases.length > 0 || supplyCases.length > 0;

  return (
    <ScrSection icon={MapPin} title="그림14. 위치도">
      <div className="relative rounded-xl overflow-hidden border border-gray-100">
        {status === "loading" && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gray-100 rounded-xl" />
        )}
        <div ref={mapRef} className="h-[360px] w-full" />
      </div>
      {hasAnyCases && status === "ready" && (
        <div className="flex items-center gap-4 mt-2 text-[11px] text-[#6e6e73]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            사업지
          </span>
          {salesCases.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
              매매사례 ({salesCases.length}건)
            </span>
          )}
          {supplyCases.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              분양사례 ({supplyCases.length}건)
            </span>
          )}
        </div>
      )}
      {primaryAddress && (
        <p className="text-[11px] text-[#86868b] mt-1">주소: {primaryAddress}</p>
      )}
    </ScrSection>
  );
}

/* ─── 메인 IV장 컴포넌트 ─── */
export function ScrChapterIV({ data, siteAddress }: ScrChapterIVProps) {
  const hasLocation =
    data.location.transportation.length > 0 ||
    data.location.livingInfra.length > 0 ||
    data.location.education.length > 0;

  return (
    <div className="space-y-5">
      {hasLocation ? (
        <LocationSection data={data.location} />
      ) : (
        <ScrSection icon={MapPin} title="표30. 입지여건">
          <EmptyDataNotice message="입지여건 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      <LocationMap
        siteAddress={siteAddress}
        summary={data.location.summary}
        salesCases={data.priceReview.salesCases}
        supplyCases={data.priceReview.supplyCases}
      />

      {data.nearbyDevelopment.length > 0 ? (
        <NearbyDevelopmentTable rows={data.nearbyDevelopment} />
      ) : (
        <ScrSection icon={Home} title="표31. 인근 개발 계획">
          <EmptyDataNotice message="인근 개발 계획 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.facilityOverview && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-[#1d1d1f]">시설개요 및 특성</h4>
          </div>
          <div className="p-5">
            <p className="text-sm text-[#424245] leading-relaxed">{data.facilityOverview}</p>
          </div>
        </div>
      )}

      {data.priceReview.regionalTrend.length > 0 ? (
        <RegionalTrendChart data={data.priceReview.regionalTrend} />
      ) : (
        <ScrSection icon={TrendingUp} title="표32. 지역 평균 시세 및 분양가 추이">
          <EmptyDataNotice message="시세 추이 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.priceReview.salesCases.length > 0 ? (
        <SalesCasesTable cases={data.priceReview.salesCases} />
      ) : (
        <ScrSection icon={Home} title="표33~34. 인근 매매사례">
          <EmptyDataNotice message="인근 매매사례 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.priceReview.supplyCases.length > 0 ? (
        <SupplyCasesTable cases={data.priceReview.supplyCases} />
      ) : (
        <ScrSection icon={Home} title="표35~36. 인근 분양사례">
          <EmptyDataNotice message="인근 분양사례 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {data.priceReview.premiumAnalysis.length > 0 ? (
        <ScrSection icon={TrendingUp} title="표37. 프리미엄 분석">
          <PremiumTable rows={data.priceReview.premiumAnalysis} />
        </ScrSection>
      ) : (
        <ScrSection icon={TrendingUp} title="표37. 프리미엄 분석">
          <EmptyDataNotice message="프리미엄 분석 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      <AdequacyOpinionSection data={data.adequacyOpinion} />
    </div>
  );
}
