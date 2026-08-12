"use client";
import { useEffect, useRef } from "react";

interface Blip {
  x: number;
  y: number;
  alpha: number;
  size: number;
  special: boolean;
}

export function RadarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const blipDefs = Array.from({ length: 16 }, (_, i) => ({
      a: Math.random() * Math.PI * 2,
      r: 0.18 + Math.random() * 0.72,
      special: i === 4,
    }));

    let angle = -Math.PI / 2;
    const blips: Blip[] = [];
    let rafId: number;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.48;
      const maxR = Math.min(w, h) * 0.46;

      ctx.clearRect(0, 0, w, h);

      // Concentric rings
      const ringCount = 5;
      for (let i = 1; i <= ringCount; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * (i / ringCount), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(37,99,235,${0.04 + 0.03 * (ringCount - i + 1)})`;
        ctx.lineWidth = i === ringCount ? 1.2 : 0.8;
        ctx.stroke();
      }

      // Crosshair lines
      const lines: [number, number, number, number][] = [
        [cx - maxR, cy, cx + maxR, cy],
        [cx, cy - maxR, cx, cy + maxR],
        [cx - maxR * 0.707, cy - maxR * 0.707, cx + maxR * 0.707, cy + maxR * 0.707],
        [cx - maxR * 0.707, cy + maxR * 0.707, cx + maxR * 0.707, cy - maxR * 0.707],
      ];
      ctx.strokeStyle = "rgba(37,99,235,0.06)";
      ctx.lineWidth = 0.5;
      lines.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Sweep trail (fan slices from current angle backwards)
      const sweepLen = Math.PI * 0.65;
      const steps = 64;
      for (let i = 0; i < steps; i++) {
        const a1 = angle - sweepLen * (i + 1) / steps;
        const a2 = angle - sweepLen * i / steps;
        const alpha = (1 - i / steps) * 0.26;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, a1, a2);
        ctx.closePath();
        ctx.fillStyle = `rgba(37,99,235,${alpha})`;
        ctx.fill();
      }

      // Sweep line
      const sx = cx + Math.cos(angle) * maxR;
      const sy = cy + Math.sin(angle) * maxR;
      const lineGrad = ctx.createLinearGradient(cx, cy, sx, sy);
      lineGrad.addColorStop(0, "rgba(37,99,235,0)");
      lineGrad.addColorStop(0.3, "rgba(100,160,255,0.6)");
      lineGrad.addColorStop(1, "rgba(130,185,255,0.95)");
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100,160,255,0.9)";
      ctx.fill();

      // Detect and spawn blips
      blipDefs.forEach(({ a, r, special }) => {
        let diff = (angle - a) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        if (diff < 0.05) {
          blips.push({
            x: cx + Math.cos(a) * r * maxR,
            y: cy + Math.sin(a) * r * maxR,
            alpha: 1,
            size: special ? 3.5 : 2 + Math.random() * 2.5,
            special,
          });
        }
      });

      // Draw blips
      for (let i = blips.length - 1; i >= 0; i--) {
        const b = blips[i];
        const glowR = b.size * 5;
        const coreColor = b.special ? "rgba(251,146,60," : "rgba(160,210,255,";
        const glowInner = b.special ? `rgba(251,146,60,${b.alpha * 0.6})` : `rgba(100,160,255,${b.alpha * 0.55})`;
        const glowOuter = b.special ? "rgba(251,100,0,0)" : "rgba(37,99,235,0)";

        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR);
        glow.addColorStop(0, glowInner);
        glow.addColorStop(1, glowOuter);
        ctx.beginPath();
        ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = `${coreColor}${b.alpha})`;
        ctx.fill();

        b.alpha -= 0.0045;
        if (b.alpha <= 0) blips.splice(i, 1);
      }

      angle += 0.008;
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}
