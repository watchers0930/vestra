"use client";

/* 임시 진단 페이지 — 웨일 태블릿 지도 터치 문제 근본원인 규명용. 확인 후 삭제 예정. */

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TouchTestPage() {
  const [caps, setCaps] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState({ touch: 0, pointer: 0, mouse: 0 });
  const [mapReady, setMapReady] = useState(false);
  const mapA = useRef<HTMLDivElement>(null); // 기본 카카오맵
  const mapB = useRef<HTMLDivElement>(null); // 커스텀 포인터 핸들러

  useEffect(() => {
    const raf = requestAnimationFrame(() => setCaps({
      maxTouchPoints: String(navigator.maxTouchPoints),
      ontouchstart: String("ontouchstart" in window),
      pointerEvents: String("onpointerdown" in window),
      pointerCoarse: String(window.matchMedia?.("(pointer: coarse)")?.matches),
      ua: navigator.userAgent,
    }));

    const c = { touch: 0, pointer: 0, mouse: 0 };
    const box = document.getElementById("evbox");
    if (box) {
      box.addEventListener("touchmove", () => { c.touch++; setCounts({ ...c }); }, { passive: true });
      box.addEventListener("pointermove", () => { c.pointer++; setCounts({ ...c }); });
      box.addEventListener("mousemove", () => { c.mouse++; setCounts({ ...c }); });
    }

    const init = () => {
      const kakao = (window as any).kakao;
      if (!kakao?.maps?.Map || !mapA.current || !mapB.current) return false;
      const c1 = new kakao.maps.LatLng(37.5665, 126.978);
      new kakao.maps.Map(mapA.current, { center: c1, level: 5 });

      const c2 = new kakao.maps.LatLng(37.5665, 126.978);
      const bMap = new kakao.maps.Map(mapB.current, { center: c2, level: 5 });

      // ── 커스텀 포인터 기반 팬 + 핀치 (카카오 내부 터치검출과 무관하게 동작) ──
      const el = mapB.current;
      el.style.touchAction = "none";
      const pts = new Map<number, { x: number; y: number }>();
      let lastDist = 0;
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      });
      el.addEventListener("pointermove", (e) => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId)!;
        if (pts.size === 1) {
          const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
          bMap.panBy(-dx, -dy);
        } else if (pts.size === 2) {
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const arr = Array.from(pts.values());
          const dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
          if (lastDist) {
            if (dist - lastDist > 40) { bMap.setLevel(bMap.getLevel() - 1); lastDist = dist; }
            else if (lastDist - dist > 40) { bMap.setLevel(bMap.getLevel() + 1); lastDist = dist; }
          } else lastDist = dist;
          return;
        }
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      });
      const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) lastDist = 0; };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);

      requestAnimationFrame(() => setMapReady(true));
      return true;
    };

    if (!init()) {
      const iv = setInterval(() => { if (init()) clearInterval(iv); }, 300);
      setTimeout(() => clearInterval(iv), 15000);
    }
    return () => cancelAnimationFrame(raf);
  }, []);

  const cell: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid #eee", fontSize: 13, wordBreak: "break-all" };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>지도 터치 진단</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, marginBottom: 12 }}>
        <div style={cell}><b>maxTouchPoints</b>: {caps.maxTouchPoints}</div>
        <div style={cell}><b>ontouchstart</b>: {caps.ontouchstart}</div>
        <div style={cell}><b>pointerEvents</b>: {caps.pointerEvents}</div>
        <div style={cell}><b>pointer:coarse</b>: {caps.pointerCoarse}</div>
        <div style={cell}><b>UA</b>: {caps.ua}</div>
        <div style={cell}><b>지도 초기화</b>: {mapReady ? "완료" : "대기중"}</div>
      </div>

      <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600 }}>① 아래 회색 박스를 손가락으로 문질러 주세요 (어떤 이벤트가 잡히는지)</div>
      <div id="evbox" style={{ height: 90, background: "#eef", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginBottom: 6, touchAction: "none" }}>
        touch: {counts.touch} / pointer: {counts.pointer} / mouse: {counts.mouse}
      </div>

      <div style={{ margin: "14px 0 6px", fontSize: 13, fontWeight: 600 }}>② 기본 지도 — 드래그/핀치 되나요?</div>
      <div ref={mapA} style={{ height: 240, borderRadius: 8, background: "#e8ecef" }} />

      <div style={{ margin: "14px 0 6px", fontSize: 13, fontWeight: 600 }}>③ 수정 지도(커스텀 핸들러) — 드래그/핀치 되나요?</div>
      <div ref={mapB} style={{ height: 240, borderRadius: 8, background: "#e8ecef", touchAction: "none" }} />

      <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>* 진단용 임시 페이지입니다.</p>
    </div>
  );
}
