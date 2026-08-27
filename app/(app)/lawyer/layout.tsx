import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * 변호사(전문가) 영역 서버 역할 가드.
 * 공용 (app) 레이아웃(SessionGuard + Sidebar)을 그대로 상속하고,
 * 여기서는 LAWYER 역할만 서버에서 추가 검증한다(클라이언트 우회 차단).
 */
export default async function LawyerAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/lawyer");
  if (session.user.role !== "LAWYER") redirect("/dashboard");
  return <>{children}</>;
}
