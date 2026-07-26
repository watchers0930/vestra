"use client";

import { Ruler, Building2, ShieldCheck, Clock } from "lucide-react";

export interface ListingSlideData {
  id: string;
  listingType: string;
  address: string;
  roomType: string | null;
  size: number | null;
  floor: number | null;
  totalFloor: number | null;
  deposit: string;
  managementFee: string | null;
  duration: number | null;
  photos: string[] | null;
  description: string | null;
  isCertified: boolean;
  jeonseRatio: number | null;
  officialPrice: string | null;
  latitude: number | null;
  longitude: number | null;
  availableFrom: string | null;
  owner: { id: string; name: string | null; companyName: string | null };
}

function formatDeposit(value: string): string {
  const num = parseInt(value, 10);
  if (!num) return "-";
  if (num >= 100_000_000) {
    const eok = Math.floor(num / 100_000_000);
    const rest = Math.floor((num % 100_000_000) / 10_000);
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  if (num >= 10_000) return `${Math.floor(num / 10_000).toLocaleString()}만`;
  return `${num.toLocaleString()}원`;
}

export function MapSlidePanelInfo({ data }: { data: ListingSlideData }) {
  const depositStr = formatDeposit(data.deposit);
  const typeLabel  = data.listingType === "JEONSE" ? "전세" : "매매";

  return (
    <div className="p-4 space-y-4">
      {/* 유형 + 주소 */}
      <div>
        <span className="rounded-md bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0071e3]">
          {typeLabel}
        </span>
        {data.roomType && (
          <span className="ml-1.5 rounded-md bg-[#f5f5f7] px-1.5 py-0.5 text-[10px] font-medium text-[#6e6e73]">
            {data.roomType}
          </span>
        )}
        <p className="mt-1.5 text-[13px] text-[#6e6e73] leading-snug">{data.address}</p>
      </div>

      {/* 가격 */}
      <div className="rounded-xl bg-[#f5f5f7] px-4 py-3">
        <p className="text-[11px] text-[#6e6e73] mb-0.5">{typeLabel === "전세" ? "전세 보증금" : "매매가"}</p>
        <p className="text-[20px] font-extrabold text-[#1d1d1f] leading-none">{depositStr}원</p>
        {data.jeonseRatio != null && data.listingType === "JEONSE" && (
          <p className="mt-1 text-[11px] text-[#6e6e73]">
            전세가율 <span className={`font-semibold ${data.jeonseRatio >= 80 ? "text-red-500" : "text-[#0071e3]"}`}>
              {data.jeonseRatio.toFixed(1)}%
            </span>
            {data.jeonseRatio >= 80 && <span className="ml-1 text-red-500">⚠ 고위험</span>}
          </p>
        )}
        {data.managementFee && parseInt(data.managementFee) > 0 && (
          <p className="mt-0.5 text-[11px] text-[#6e6e73]">
            관리비 {formatDeposit(data.managementFee)}원
          </p>
        )}
      </div>

      {/* 세부 정보 칩 */}
      <div className="flex flex-wrap gap-2">
        {data.size && (
          <InfoChip icon={<Ruler className="h-3 w-3" strokeWidth={1.5} />} label={`${data.size}㎡`} />
        )}
        {data.floor != null && (
          <InfoChip
            icon={<Building2 className="h-3 w-3" strokeWidth={1.5} />}
            label={data.totalFloor ? `${data.floor}/${data.totalFloor}층` : `${data.floor}층`}
          />
        )}
        {data.duration && (
          <InfoChip icon={<Clock className="h-3 w-3" strokeWidth={1.5} />} label={`계약 ${data.duration}개월`} />
        )}
      </div>

      {/* 안전 인증 */}
      {data.isCertified && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" strokeWidth={1.5} />
          <p className="text-[12px] font-semibold text-green-700">VESTRA 안심인증 매물</p>
        </div>
      )}

      {/* 설명 */}
      {data.description && (
        <div>
          <p className="text-[11px] font-medium text-[#6e6e73] mb-1">매물 설명</p>
          <p className="text-[12px] text-[#3d3d3f] leading-relaxed line-clamp-4">{data.description}</p>
        </div>
      )}

      {/* 등록자 */}
      <div className="border-t border-[#f0f0f5] pt-3">
        <p className="text-[11px] text-[#aeaeb2]">
          등록인 · {data.owner.companyName ?? data.owner.name ?? "비공개"}
        </p>
      </div>
    </div>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] text-[#6e6e73]">
      {icon}
      {label}
    </span>
  );
}
