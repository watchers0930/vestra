import { FileText, Shield, TrendingUp, Home, BarChart3 } from "lucide-react";

export const typeIcons: Record<string, typeof FileText> = {
  rights: Shield,
  contract: FileText,
  prediction: TrendingUp,
  jeonse: Home,
  feasibility: BarChart3,
};

export const typeColors: Record<string, { bg: string; text: string }> = {
  rights: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  contract: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  prediction: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  jeonse: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
  feasibility: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]" },
};
