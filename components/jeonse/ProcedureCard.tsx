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
  easy:   { text: "쉬움",   color: "text-emerald-600" },
  medium: { text: "보통",   color: "text-amber-600" },
  hard:   { text: "어려움", color: "text-red-600" },
};

export default function ProcedureCard({ href, icon: Icon, title, description, badge, stepCount, difficulty, requiresLandlord }: ProcedureCardProps) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon size={22} className="text-primary" />
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
          <span className={difficultyLabel[difficulty].color}>{difficultyLabel[difficulty].text}</span>
          {requiresLandlord && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Users size={10} /> 임대인 동의
            </span>
          )}
          <ArrowRight size={14} className="ml-auto text-muted" />
        </div>
      </Card>
    </Link>
  );
}
