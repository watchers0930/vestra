"use client";

import dynamic from "next/dynamic";
import s from "../rights-renewal.module.css";
import type { UnifiedResult } from "@/components/rights/RightsResult";
import { AiDisclaimer } from "@/components/common";
import type { AnalysisStep } from "@/app/(app)/rights/types";

// 무거운 결과 렌더러 — done 상태에서만 로드
const RightsResult = dynamic(
  () => import("@/components/rights/RightsResult").then((m) => m.RightsResult),
  { loading: () => <div className={s.rcard} style={{ textAlign: "center", padding: "40px" }}><div className={s.spinner} /></div> },
);

interface Props {
  step: AnalysisStep;
  result: UnifiedResult | null;
  error: string | null;
  ownerMatch: boolean | null;
  registryOwnerMasked: string;
  rawText: string;
}

const STEP_LABEL: Record<string, string> = {
  "tilko-fetch": "등기부등본 조회 중...",
  extracting: "파일 텍스트 추출 중...",
  parsing: "등기부등본 파싱 중...",
  validating: "권리관계 검증 중...",
  scoring: "위험도 점수 산출 중...",
  molit: "실거래가 대조 중...",
  ai: "AI 종합 의견 생성 중...",
};

/** 분석 결과 영역 — 상태별 렌더(에러 / 로딩 / 소유자불일치 차단 / 실결과 / 예시). */
export default function RightsResultPanel({
  step,
  result,
  error,
  ownerMatch,
  registryOwnerMasked,
  rawText,
}: Props) {
  const analyzing = step !== "idle" && step !== "done";

  // 1) 에러
  if (error) {
    return (
      <div className={s.rcard}>
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: "34px", marginBottom: "12px" }}>⚠️</div>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#b91c1c", marginBottom: "8px" }}>
            분석에 실패했습니다
          </p>
          <p style={{ fontSize: "13.5px", color: "#6b7280", lineHeight: 1.6 }}>{error}</p>
          <p style={{ fontSize: "12.5px", color: "#9ca3af", marginTop: "10px" }}>
            입력 내용을 확인하거나 잠시 후 다시 시도해 주세요.
          </p>
        </div>
      </div>
    );
  }

  // 2) 분석 진행 중
  if (analyzing) {
    return (
      <div className={s.rcard} aria-busy="true" aria-live="polite">
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <div className={s.spinner} />
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", marginTop: "18px" }}>
            등기부등본 종합 분석 중
          </p>
          <p style={{ fontSize: "13px", color: "#8b8b90", marginTop: "6px" }}>
            {STEP_LABEL[step] ?? "분석을 준비하고 있습니다..."}
          </p>
          <p style={{ fontSize: "12px", color: "#b5b5ba", marginTop: "4px" }}>약 10~15초 소요</p>
        </div>
      </div>
    );
  }

  // 3) 소유자 불일치 — 결과 제공 차단
  if (result && step === "done" && ownerMatch === false) {
    return (
      <div
        className={s.rcard}
        style={{ border: "1.5px solid #ff3b30", background: "rgba(255,59,48,0.04)" }}
      >
        <div style={{ textAlign: "center", padding: "20px 8px" }}>
          <div style={{ fontSize: "34px", marginBottom: "12px" }}>🚫</div>
          <p style={{ fontSize: "17px", fontWeight: 800, color: "#1d1d1f", marginBottom: "10px" }}>
            소유자 불일치 — 분석 결과 제공 불가
          </p>
          <p style={{ fontSize: "13px", color: "#3c3c43", lineHeight: 1.65, marginBottom: "18px" }}>
            입력하신 소유자명이 등기부에 기재된 실제 소유자와 다릅니다.<br />
            임대인이 해당 부동산의 실제 소유자가 아닐 수 있으니 주의하세요.
          </p>
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: "12px",
              background: "rgba(255,59,48,0.08)",
              border: "1px solid rgba(255,59,48,0.20)",
            }}
          >
            <p style={{ fontSize: "13px", color: "#86868b", marginBottom: "4px" }}>등기부상 소유자 (성만 공개)</p>
            <p style={{ fontSize: "22px", fontWeight: 900, color: "#ff3b30", letterSpacing: "0.08em" }}>
              {registryOwnerMasked || "확인 불가"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4) 실 분석 결과
  if (result && step === "done") {
    return (
      <div id="rights-result" aria-live="polite">
        <AiDisclaimer compact className="mb-4" />
        <RightsResult result={result} rawText={rawText} />
      </div>
    );
  }

  // 5) idle — 분석 대기 상태 (하드코딩 데이터 없음, 실분석 결과만 표시)
  return (
    <div className={s.rcard}>
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <svg
          width="46" height="46" viewBox="0 0 24 24" fill="none"
          stroke="#c3cbe6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          style={{ margin: "0 auto 18px" }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1d2e", marginBottom: "8px" }}>
          분석 결과가 여기에 표시됩니다
        </p>
        <p style={{ fontSize: "13px", color: "#8b90a6", lineHeight: 1.75 }}>
          좌측에서 주소를 입력하거나 등기부등본을 업로드한 뒤<br />
          &lsquo;종합 권리분석 시작&rsquo;을 누르면<br />
          갑구·을구 권리관계와 위험도를 실제 데이터로 분석해 드립니다.
        </p>
      </div>
    </div>
  );
}
