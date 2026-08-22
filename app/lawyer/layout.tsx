import SessionGuard from "@/components/auth/session-guard";
import { LawyerHeader } from "./components/LawyerHeader";

/** 전문가(변호사) 전용 레이아웃 — 로그인 가드 + 전용 헤더 (개인용 사이드바 없음) */
export default function LawyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="min-h-screen bg-gray-50">
        <LawyerHeader />
        <main>{children}</main>
      </div>
    </SessionGuard>
  );
}
