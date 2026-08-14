import type { Metadata } from "next";
import AssistantClient from "./AssistantClient";

export const metadata: Metadata = {
  title: "AI 어시스턴트 - VESTRA",
  description: "부동산 궁금증을 VESTRA AI에게 물어보세요",
};

export default function AssistantRenewalPage() {
  return <AssistantClient />;
}
