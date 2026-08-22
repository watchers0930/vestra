import { notFound } from "next/navigation";
import { EXPERTS } from "@/app/(app)/expert-connect/constants";
import LawyerHomeContent from "./LawyerHomeContent";

export const metadata = {
  title: "변호사 내용증명 - VESTRA",
  description: "선택한 변호사에게 AI 내용증명 작성을 의뢰합니다",
};

export default async function LawyerKeepzipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expert = EXPERTS.find((e) => e.id === id);
  // 변호사만 내용증명 미니홈페이지 진입 허용
  if (!expert || expert.category !== "변호사") notFound();
  return <LawyerHomeContent expert={expert} />;
}
