"use client";

import { Check } from "lucide-react";

interface RoleTypeCardProps {
  role: "PERSONAL" | "RENTAL_BIZ" | "REALESTATE" | "BUSINESS";
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  selected: boolean;
  onSelect: () => void;
}

export default function RoleTypeCard({
  icon,
  title,
  description,
  features,
  selected,
  onSelect,
}: RoleTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ padding: 24 }}
      className={`
        relative w-full text-left rounded-2xl border transition-all cursor-pointer
        ${
          selected
            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
            : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
        }
      `}
    >
      {/* 선택 체크마크 */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* 아이콘 */}
      <div
        style={{ marginBottom: 16 }}
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center
          ${selected ? "bg-primary/10 text-primary" : "bg-muted/10 text-muted"}
        `}
      >
        {icon}
      </div>

      {/* 제목 & 설명 */}
      <h3 style={{ marginBottom: 6 }} className="text-sm font-semibold text-foreground">{title}</h3>
      <p style={{ marginBottom: 16 }} className="text-xs text-muted">{description}</p>

      {/* 기능 목록 */}
      <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {features.map((feature) => (
          <li
            key={feature}
            style={{ gap: 8 }}
            className="flex items-center text-xs text-muted"
          >
            <div
              className={`w-1 h-1 rounded-full flex-shrink-0 ${
                selected ? "bg-primary" : "bg-muted/40"
              }`}
            />
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
}
