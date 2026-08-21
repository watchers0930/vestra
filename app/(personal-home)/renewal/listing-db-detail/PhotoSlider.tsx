"use client";

import { useState, useEffect } from "react";

interface Props {
  photos: string[];
  minHeight?: number;
}

const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: 10,
  transform: "translateY(-50%)",
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "none",
  background: "rgba(15,37,71,.55)",
  color: "#fff",
  fontSize: 20,
  lineHeight: "34px",
  cursor: "pointer",
  zIndex: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

// 매물 사진 슬라이더 (자동 전환 + 화살표/도트 수동 이동)
export default function PhotoSlider({ photos, minHeight = 300 }: Props) {
  const [idx, setIdx] = useState(0);
  const n = photos.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 4000);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;
  const go = (i: number) => setIdx((i + n) % n);

  return (
    <div style={{ position: "relative", width: "100%", minHeight, borderRadius: 12, overflow: "hidden", background: "#0f2547" }}>
      {photos.map((src, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === idx ? 1 : 0,
            transition: "opacity .5s ease",
          }}
        />
      ))}

      {n > 1 && (
        <>
          <button type="button" onClick={() => go(idx - 1)} aria-label="이전 사진" style={arrowStyle("left")}>‹</button>
          <button type="button" onClick={() => go(idx + 1)} aria-label="다음 사진" style={arrowStyle("right")}>›</button>
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 3 }}>
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}번째 사진`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === idx ? "#fff" : "rgba(255,255,255,.5)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
