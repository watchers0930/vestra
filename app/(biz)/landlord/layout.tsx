import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * 임대사업자(RENTAL_BIZ) 전용 라우트 가드.
 * 상위 (biz)/layout은 REALESTATE·RENTAL_BIZ 공용이므로,
 * 중개사가 /landlord로 직접 접근하는 것을 여기서 차단한다.
 */
export default async function LandlordRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "RENTAL_BIZ") redirect("/dashboard");
  return <>{children}</>;
}
