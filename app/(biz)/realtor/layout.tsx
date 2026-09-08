import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * 중개사(REALESTATE) 전용 라우트 가드.
 * 상위 (biz)/layout은 REALESTATE·RENTAL_BIZ 공용이므로,
 * 임대사업자가 /realtor로 직접 접근하는 것을 여기서 차단한다.
 */
export default async function RealtorRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "REALESTATE") redirect("/dashboard");
  return <>{children}</>;
}
