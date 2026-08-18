"use client";

import { useEffect, useRef } from "react";

/** 히어로 배경 레이더 스캔 애니메이션 (감속 모션 시 1프레임 정지) */
export function MobileRadar({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, cx = 0, cy = 0, R = 0, ang = 0, raf = 0;
    const blips = Array.from({ length: 7 }, () => ({
      a: Math.random() * Math.PI * 2,
      d: 0.25 + Math.random() * 0.7,
      t: Math.random(),
    }));

    function resize() {
      const r = cv!.getBoundingClientRect();
      W = cv!.width = r.width * dpr;
      H = cv!.height = r.height * dpr;
      cx = W * 0.72; cy = H * 0.34; R = Math.max(W, H) * 0.62;
    }
    resize();

    function draw() {
      const c = ctx!;
      c.clearRect(0, 0, W, H);
      c.strokeStyle = "rgba(59,130,246,0.20)"; c.lineWidth = 1 * dpr;
      for (let i = 1; i <= 4; i++) { c.beginPath(); c.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = "rgba(59,130,246,0.12)";
      [0, Math.PI / 2].forEach((a) => { c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); c.stroke(); });
      const grd = c.createConicGradient ? c.createConicGradient(ang, cx, cy) : null;
      if (grd) {
        grd.addColorStop(0, "rgba(59,130,246,0.34)");
        grd.addColorStop(0.12, "rgba(59,130,246,0.02)");
        grd.addColorStop(1, "rgba(59,130,246,0)");
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, ang - 0.9, ang); c.closePath(); c.fillStyle = grd; c.fill();
      }
      c.strokeStyle = "rgba(96,165,250,0.5)"; c.lineWidth = 1.4 * dpr;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); c.stroke();
      blips.forEach((b) => {
        const bx = cx + Math.cos(b.a) * R * b.d, by = cy + Math.sin(b.a) * R * b.d;
        let diff = (ang - b.a) % (Math.PI * 2); if (diff < 0) diff += Math.PI * 2;
        if (diff < 0.5) b.t = 1;
        b.t *= 0.972;
        if (b.t > 0.02) {
          c.fillStyle = `rgba(96,165,250,${b.t * 0.9})`;
          c.beginPath(); c.arc(bx, by, 3 * dpr, 0, Math.PI * 2); c.fill();
          c.strokeStyle = `rgba(96,165,250,${b.t * 0.4})`; c.lineWidth = 1 * dpr;
          c.beginPath(); c.arc(bx, by, (1 - b.t) * 14 * dpr + 4 * dpr, 0, Math.PI * 2); c.stroke();
        }
      });
      ang += 0.016;
      if (!reduce && mobileMq.matches) raf = requestAnimationFrame(draw);
    }

    // 모바일 뷰포트일 때만 애니메이션 (데스크탑에선 숨겨진 캔버스라 rAF 낭비 방지)
    function onMqChange(e: MediaQueryListEvent) {
      if (e.matches) { resize(); cancelAnimationFrame(raf); draw(); }
      else cancelAnimationFrame(raf);
    }
    if (mobileMq.matches) draw();
    mobileMq.addEventListener("change", onMqChange);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mobileMq.removeEventListener("change", onMqChange);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
