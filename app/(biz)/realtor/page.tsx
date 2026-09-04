import type { Metadata } from "next";
import RealtorHomeClient from "./RealtorHomeClient";

export const metadata: Metadata = {
  title: "중개사 홈 · VESTRA",
  description: "매물·거래·의향서·등기감시를 한눈에 관리하는 중개사 워크스페이스",
};

// 접근 제어(REALESTATE 전용)는 (biz)/layout.tsx에서 서버 판별한다.
export default function RealtorHomePage() {
  return <RealtorHomeClient />;
}
