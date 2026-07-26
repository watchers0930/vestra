"use client";

import { SOURCE_BADGE_DEFINITIONS, PAGE_SOURCE_BADGES } from "@/lib/source-badges";
import type { SourceBadgePageKey } from "@/lib/source-badges";

export type SourceBadgeProps = {
  pageKey: SourceBadgePageKey;
  className?: string;
};

export function SourceBadge({ pageKey, className }: SourceBadgeProps) {
  const keys = PAGE_SOURCE_BADGES[pageKey];

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px",
      }}
    >
      {/* GAP-01: <style> 루프 밖으로 한 번만 삽입 */}
      <style>{`.source-badge-wrap:hover .source-badge-tooltip { opacity: 1; }`}</style>
      <span style={{ fontSize: "11px", color: "#aeaeb2", flexShrink: 0 }}>데이터 출처</span>
      {keys.map((key) => {
        const badge = SOURCE_BADGE_DEFINITIONS[key];
        if (!badge) return null;
        return (
          <span
            key={key}
            style={{ position: "relative", display: "inline-block" }}
            className="source-badge-wrap"
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 9px",
                borderRadius: "20px",
                background: "#f5f5f7",
                border: "1px solid rgba(0,0,0,0.08)",
                fontSize: "11px",
                color: "#3c3c43",
                cursor: "default",
                whiteSpace: "nowrap",
              }}
            >
              {badge.label}
            </span>
            <span
              className="source-badge-tooltip"
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#1d1d1f",
                color: "#fff",
                fontSize: "11px",
                lineHeight: 1.55,
                padding: "6px 10px",
                borderRadius: "8px",
                whiteSpace: "normal",
                wordBreak: "break-word",
                maxWidth: "220px",
                zIndex: 50,
                pointerEvents: "none",
                opacity: 0,
                transition: "opacity 0.15s",
              }}
            >
              {badge.tooltip}
            </span>
          </span>
        );
      })}
    </div>
  );
}
