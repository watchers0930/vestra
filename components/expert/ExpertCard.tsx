"use client";

import { Star, Briefcase, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Expert {
  id: string;
  name: string; // masked, e.g. "김○○"
  category: string;
  specialties: string[];
  experience: number; // years
  rating: number;
  reviewCount: number;
  consultFee: number; // KRW
  available: boolean;
}

interface ExpertCardProps {
  expert: Expert;
  onConsult?: (expert: Expert) => void;
  className?: string;
}

function formatFee(fee: number) {
  if (fee >= 10000) return `${(fee / 10000).toLocaleString()}만원`;
  return `${fee.toLocaleString()}원`;
}

export function ExpertCard({ expert, onConsult, className }: ExpertCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white border border-[#e5e5e7] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col",
        "transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar placeholder */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f7] flex-shrink-0">
          <span className="text-base font-semibold text-[#424245]">
            {expert.name.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-[#1d1d1f] truncate">
              {expert.name}
            </h3>
            <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" />
          </div>
          <p className="text-xs text-[#6e6e73] mt-0.5">{expert.category}</p>
        </div>
        {/* Rating */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Star size={13} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-medium text-[#1d1d1f]">
            {expert.rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-[#86868b]">
            ({expert.reviewCount})
          </span>
        </div>
      </div>

      {/* Specialties */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {expert.specialties.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[10px] text-[#424245] border border-[#e5e5e7]"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[#6e6e73] mb-4">
        <span className="flex items-center gap-1">
          <Briefcase size={12} />
          경력 {expert.experience}년
        </span>
        <span>상담료 {formatFee(expert.consultFee)}</span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onConsult?.(expert)}
        disabled={!expert.available}
        className={cn(
          "mt-auto w-full rounded-xl py-2.5 text-sm font-medium transition-colors",
          expert.available
            ? "bg-[#1d1d1f] text-white hover:bg-[#1d1d1f]/90"
            : "bg-[#f5f5f7] text-[#86868b] cursor-not-allowed"
        )}
      >
        {expert.available ? "상담 요청" : "상담 불가"}
      </button>
    </div>
  );
}
