"use client";

import { useRef, useState, useEffect } from "react";
import { Eraser } from "lucide-react";

/**
 * 손글씨 서명 패드 — canvas에 마우스/터치로 서명하고 PNG data URL을 상위로 전달.
 * 가계약서 당사자(임대인·임차인) 서명 입력에 사용.
 */
export function SignaturePad({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  // 캔버스 초기화 (고해상도 대응)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1d2e";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange("");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#3a3f55" }}>{label} 서명</span>
        <button type="button" onClick={clear} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7180", background: "none", border: "none", cursor: "pointer" }}>
          <Eraser size={12} strokeWidth={2} /> 지우기
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{
          width: "100%", height: 120, borderRadius: 10, background: "#fff",
          border: `1.5px ${hasDrawn ? "solid #2e4bd8" : "dashed #cfd3e0"}`,
          touchAction: "none", cursor: "crosshair", display: "block",
        }}
      />
      {!hasDrawn && <p style={{ fontSize: 11, color: "#aeb2bf", marginTop: 5, textAlign: "center" }}>위 영역에 서명해주세요</p>}
    </div>
  );
}
