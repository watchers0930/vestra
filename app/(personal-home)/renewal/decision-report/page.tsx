import { Suspense } from "react";
import DecisionReportRenewalClient from "./DecisionReportRenewalClient";

export const metadata = {
  title: "의사결정 통합 리포트 - VESTRA",
  description: "대출·시세·안전성 종합 의사결정 리포트",
};

export default function DecisionReportRenewalPage() {
  return (
    <Suspense fallback={null}>
      <DecisionReportRenewalClient />
    </Suspense>
  );
}
