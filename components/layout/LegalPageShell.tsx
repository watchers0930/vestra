import type { ReactNode } from "react";
import RenewalGnb from "@/app/(personal-home)/renewal/_shared/RenewalGnb";
import SiteFooter from "@/components/layout/SiteFooter";

/**
 * 법적고지·개인정보처리방침·이용약관·취소환불정책 등 app 직속 공개 페이지용 레이아웃.
 * 이 페이지들은 route group 밖이라 공통 GNB/Footer가 없어 '내용만' 보였다 →
 * 상단 GNB + 하단 Footer를 입혀 사이트 틀을 갖춘다.
 */
export default function LegalPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <RenewalGnb />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
