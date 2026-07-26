"use client";

import Link from "next/link";
import { X, Loader2, MapPin, Building2 } from "lucide-react";
import { MapSlidePanelPhotos } from "./MapSlidePanelPhotos";
import { MapSlidePanelInfo, type ListingSlideData } from "./MapSlidePanelInfo";

interface MapSlidePanelProps {
  listingId: string | null;
  data: ListingSlideData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function MapSlidePanel({ data, loading, error, onClose }: MapSlidePanelProps) {
  const typeLabel = data?.listingType === "JEONSE" ? "전세" : "매매";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#EEF1F8] px-5 py-4">
        {data ? (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0071e3]" strokeWidth={1.5} />
            <span className="truncate text-[13px] font-semibold text-[#1d1d1f]">
              {typeLabel} · {data.roomType ?? "매물"}
            </span>
          </div>
        ) : (
          <span className="text-[13px] font-semibold text-[#1d1d1f]">매물 정보</span>
        )}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-48 items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#0071e3]" strokeWidth={1.5} />
            <span className="text-sm text-[#6e6e73]">불러오는 중...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <Building2 className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
            <p className="text-sm text-[#6e6e73]">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <MapSlidePanelPhotos
              photos={data.photos}
              alt={`${data.roomType ?? ""} ${data.address}`}
              lat={data.latitude}
              lng={data.longitude}
            />
            <MapSlidePanelInfo data={data} />

            {/* CTA */}
            <div className="border-t border-[#EEF1F8] px-5 py-4 flex flex-col gap-2">
              <Link
                href={`/listings/${data.id}`}
                className="flex w-full items-center justify-center rounded-xl bg-[#0071e3] px-3 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#0077ED]"
              >
                상세보기 · 계약의향서 보내기
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
