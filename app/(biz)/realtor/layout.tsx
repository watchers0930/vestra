import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * 사업자 홈(/realtor) 라우트 가드.
 * 중개사(REALESTATE)·임대사업자(RENTAL_BIZ)가 동일한 중개사 UI를 공용한다.
 * 그 외 역할은 역할 분배 허브(/dashboard)로 돌려보낸다.
 */
export default async function RealtorRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "REALESTATE" && role !== "RENTAL_BIZ") redirect("/dashboard");
  return <>{children}</>;
}
