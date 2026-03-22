import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "등기부등본 분석",
  description: "등기부등본을 업로드하면 AI가 권리관계를 자동 분석합니다",
};

export default function RegistryPage() {
  redirect("/rights");
}
