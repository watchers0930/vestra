"use client";

/**
 * V-Score 레이더 차트 (5축)
 * ─────────────────────────
 * 등기/시세/계약/임대인/지역 5개 소스를 SVG 기반 레이더로 시각화.
 * 외부 라이브러리 없이 순수 SVG 구현.
 */

import type { VScoreSource } from "@/lib/patent-types";

interface VScoreRadarProps {
  sources: VScoreSource[];
  size?: number;
}

const AXIS_LABELS = ["등기 권리", "시세/전세", "계약서", "임대인", "지역"];
const AXIS_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];

export default function VScoreRadar({
  sources,
  size = 280,
}: VScoreRadarProps) {
  const center = size / 2;
  const maxRadius = size / 2 - 40;
  const levels = 5; // 동심원 수

  // 축 각도 계산 (5축, 상단부터 시작)
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // 12시 방향부터

  function polarToCartesian(angle: number, radius: number) {
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }

  // 소스 데이터 (5개 소스 순서대로)
  const orderedIds = ["registry", "price", "contract", "landlord", "region"];
  const values = orderedIds.map((id) => {
    const source = sources.find((s) => s.id === id);
    return source ? source.score / 100 : 0.5;
  });

  // 데이터 포인트 좌표
  const dataPoints = values.map((v, i) => {
    const angle = startAngle + i * angleStep;
    return polarToCartesian(angle, v * maxRadius);
  });

  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  // 등급 색상
  function getScoreColor(score: number): string {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 50) return "#f59e0b";
    if (score >= 30) return "#f97316";
    return "#ef4444";
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 배경 동심원 */}
        {Array.from({ length: levels }, (_, i) => {
          const r = (maxRadius * (i + 1)) / levels;
          const points = Array.from({ length: 5 }, (_, j) => {
            const angle = startAngle + j * angleStep;
            const p = polarToCartesian(angle, r);
            return `${p.x},${p.y}`;
          }).join(" ");
          return (
            <polygon
              key={`level-${i}`}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}

        {/* 축 선 */}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = startAngle + i * angleStep;
          const end = polarToCartesian(angle, maxRadius);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          );
        })}

        {/* 데이터 영역 */}
        <polygon
          points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3b82f6"
          strokeWidth={2}
        />

        {/* 데이터 점 */}
        {dataPoints.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={getScoreColor(values[i] * 100)}
            stroke="white"
            strokeWidth={1.5}
          />
        ))}

        {/* 축 레이블 */}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = startAngle + i * angleStep;
          const labelR = maxRadius + 22;
          const p = polarToCartesian(angle, labelR);
          const score = Math.round(values[i] * 100);
          return (
            <g key={`label-${i}`}>
              <text
                x={p.x}
                y={p.y - 6}
                textAnchor="middle"
                className="fill-current text-[10px] font-medium opacity-70"
              >
                {AXIS_LABELS[i]}
              </text>
              <text
                x={p.x}
                y={p.y + 8}
                textAnchor="middle"
                fill={AXIS_COLORS[i]}
                className="text-[11px] font-bold"
              >
                {score}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs opacity-70">
        {sources.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: AXIS_COLORS[i] || "#6b7280" }}
            />
            <span>
              {s.name} {s.dataAvailable ? "" : "(추정)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
