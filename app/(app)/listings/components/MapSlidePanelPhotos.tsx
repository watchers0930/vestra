"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { KakaoRoadview } from "@/components/common/KakaoRoadview";

interface MapSlidePanelPhotosProps {
  photos: string[] | null;
  alt: string;
  lat?: number | null;
  lng?: number | null;
}

export function MapSlidePanelPhotos({ photos, alt, lat, lng }: MapSlidePanelPhotosProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const photoList = photos ?? [];

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(() =>
    setLightboxIdx((i) => (i !== null ? (i === 0 ? photoList.length - 1 : i - 1) : null)),
    [photoList.length]
  );
  const next = useCallback(() =>
    setLightboxIdx((i) => (i !== null ? (i === photoList.length - 1 ? 0 : i + 1) : null)),
    [photoList.length]
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, prev, next, closeLightbox]);

  return (
    <div className="flex flex-col">
      {/* 로드뷰 or 플레이스홀더 */}
      {lat && lng ? (
        <KakaoRoadview lat={lat} lng={lng} className="h-48 w-full" />
      ) : (
        <div className="h-48 bg-[#EEF1F8] flex items-center justify-center">
          <Building2 className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
        </div>
      )}

      {/* 사진 썸네일 */}
      {photoList.length > 0 && (
        <div className="border-t border-[#EEF1F8]">
          <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
            {photoList.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIdx(i)}
                className="shrink-0 h-20 w-20 overflow-hidden rounded-lg border border-[#E4E9F4] bg-[#EEF1F8] transition-opacity hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxIdx !== null && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          {photoList.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoList[lightboxIdx]}
            alt={`${alt} ${lightboxIdx + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photoList.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          {photoList.length > 1 && (
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[12px] text-white">
              {lightboxIdx + 1} / {photoList.length}
            </span>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
