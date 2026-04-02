import Link from "next/link";
import { ArrowRight, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common";

interface ProcedureCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: { text: string; variant: "danger" | "warning" | "success" | "info" };
  stepCount: number;
  difficulty: "easy" | "medium" | "hard";
  requiresLandlord?: boolean;
}

const badgeColors = {
  danger:  "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  info:    "bg-blue-100 text-blue-700",
};

const difficultyLabel = {
  easy:   { text: "쉬움",   color: "text-emerald-600", hint: "온라인으로 간편하게 처리 가능" },
  medium: { text: "보통",   color: "text-amber-600",   hint: "서류 준비 후 방문 신청 필요" },
  hard:   { text: "어려움", color: "text-red-600",      hint: "법적 절차와 서류가 복잡함" },
};

export default function ProcedureCard({ href, icon: Icon, title, description, badge, stepCount, difficulty, requiresLandlord }: ProcedureCardProps) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
            <Icon size={22} strokeWidth={1.5} className="text-[#1d1d1f]" />
          </div>
          {badge && (
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", badgeColors[badge.variant])}>
              {badge.text}
            </span>
          )}
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-secondary mb-3">{description}</p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{stepCount}단계</span>
          <span className={`${difficultyLabel[difficulty].color} group/diff relative cursor-help`} title={`난이도: ${difficultyLabel[difficulty].text} - ${difficultyLabel[difficulty].hint}`}>
            {difficultyLabel[difficulty].text}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[10px] leading-tight text-white bg-[#1d1d1f] rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/diff:opacity-100 transition-opacity">
              난이도: {difficultyLabel[difficulty].text} - {difficultyLabel[difficulty].hint}
            </span>
          </span>
          {requiresLandlord && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Users size={10} strokeWidth={1.5} /> 임대인 동의
            </span>
          )}
          <ArrowRight size={14} strokeWidth={1.5} className="ml-auto text-muted" />
        </div>
      </Card>
    </Link>
  );
}
