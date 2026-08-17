"use client";

import { useRef } from "react";
import { useKakaoMap } from "@/app/(app)/listings/[id]/components/useKakaoMap";

/**
 * 국토부 실거래 매물 등 사진이 없는 매물의 사진 자리를 채우는 지도 썸네일.
 * 드래그·줌을 끈 정적 미니 지도로 위치만 보여준다.
 */
export default function MapThumbnail({
  lat, lng, minHeight = 300,
}: { lat: number; lng: number; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useKakaoMap(ref, (kakao, el) => {
    const pos = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(el, { center: pos, level: 4 });
    map.setDraggable(false);
    map.setZoomable(false);
    // 건물 핀
    const pin = document.createElement("div");
    const shape = document.createElement("div");
    Object.assign(shape.style, { width: "22px", height: "22px", borderRadius: "50% 50% 50% 0", background: "#0F2547", transform: "rotate(-45deg)", boxShadow: "0 3px 10px rgba(15,37,71,.55)", border: "2.5px solid #fff", position: "relative" });
    const dot = document.createElement("div");
    Object.assign(dot.style, { width: "7px", height: "7px", borderRadius: "50%", background: "#fff", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
    shape.appendChild(dot);
    pin.appendChild(shape);
    new kakao.maps.CustomOverlay({ map, position: pos, content: pin, yAnchor: 1.15, zIndex: 10 });
    return { map };
  }, [lat, lng]);

  return <div ref={ref} style={{ width: "100%", height: "100%", minHeight, background: "#eef1f8" }} />;
}
