import { Suspense } from "react";
import SignContent from "./SignContent";

/** 임차인 독립 서명 공개 페이지(갭5) — 로그인 없이 토큰으로 접근. /contract-sign?token=... */
export default function ContractSignPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#6b7180" }}>불러오는 중...</div>}>
      <SignContent />
    </Suspense>
  );
}
