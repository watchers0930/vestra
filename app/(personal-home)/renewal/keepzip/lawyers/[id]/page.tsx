import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LawyerHomeContent from "./LawyerHomeContent";

export const metadata = {
  title: "변호사 내용증명 - VESTRA",
  description: "선택한 변호사에게 AI 내용증명 작성을 의뢰합니다",
};

const CAT_LABEL: Record<string, string> = {
  lawyer: "변호사", judicial: "법무사", tax: "세무사", accountant: "회계사", appraiser: "감정평가사",
};

export default async function LawyerKeepzipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.lawyerPartner.findFirst({ where: { id, active: true } });
  // 내용증명 미니홈은 변호사만
  if (!p || p.category !== "lawyer") notFound();

  const expert = {
    id: p.id,
    name: p.name ?? "전문가",
    category: CAT_LABEL[p.category] ?? p.category,
    specialties: (p.careers ?? []).slice(0, 3),
    experience: (p.careers ?? []).length,
    rating: p.avgRating || 0,
    reviewCount: p.ratingCount,
    consultFee: 99000,
    available: p.active,
  };
  return <LawyerHomeContent expert={expert} />;
}
