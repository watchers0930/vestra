import { Suspense } from "react";
import LoanCheckRenewalClient from "./LoanCheckRenewalClient";

export const metadata = {
  title: "전세대출 가심사 - VESTRA",
  description: "7대 은행 전세대출 조건 비교 가심사",
};

export default function LoanCheckRenewalPage() {
  return (
    <Suspense fallback={null}>
      <LoanCheckRenewalClient />
    </Suspense>
  );
}
