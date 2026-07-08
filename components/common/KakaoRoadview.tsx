"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface KakaoRoadviewProps {
  lat: number;
  lng: number;
  className?: string;
}

export function KakaoRoadview({ lat, lng, className }: KakaoRoadviewProps) {
  const uid   = useId();
  const domId = `roadview-${uid.replace(/:/g, "")}`;
  const rvRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "none">("loading");

  useEffect(() => {
    if (!lat || !lng) { setStatus("none"); return; }

    let cancelled = false;

    function init() {
      if (cancelled) return;
      const container = document.getElementById(domId);
      if (!container) return;

      if (!window.kakao?.maps?.Roadview) { setStatus("none"); return; }

      const roadview = new window.kakao.maps.Roadview(container);
      rvRef.current  = roadview;

      const client   = new window.kakao.maps.RoadviewClient();
      const position = new window.kakao.maps.LatLng(lat, lng);

      client.getNearestPanoId(position, 100, (panoId: number | null) => {
        if (cancelled) return;
        panoId === null ? setStatus("none") : (roadview.setPanoId(panoId, position), setStatus("ok"));
      });
    }

    function tryInit() {
      if (window.kakao?.maps?.Roadview) {
        init();
      } else if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => { if (!cancelled) init(); });
      } else {
        const t0 = Date.now();
        const timer = setInterval(() => {
          if (cancelled) { clearInterval(timer); return; }
          if (window.kakao?.maps?.Roadview) {
            clearInterval(timer); init();
          } else if (window.kakao?.maps?.load) {
            clearInterval(timer);
            window.kakao.maps.load(() => { if (!cancelled) init(); });
          } else if (Date.now() - t0 > 15000) {
            clearInterval(timer); setStatus("none");
          }
        }, 200);
        return () => clearInterval(timer);
      }
    }

    const cleanup = tryInit();
    return () => { cancelled = true; cleanup?.(); };
  }, [domId, lat, lng]);

  return (
    <div className={`relative overflow-hidden bg-[#EEF1F8] ${className ?? ""}`}>
      <div id={domId} className={`h-full w-full ${status === "none" ? "hidden" : ""}`} />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
        </div>
      )}
      {status === "none" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <MapPin className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
          <span className="text-[12px] text-slate-400">이 위치는 로드뷰가 지원되지 않습니다</span>
        </div>
      )}
    </div>
  );
}
