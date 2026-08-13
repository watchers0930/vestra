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

  // 5) idle — 예시 결과 프리뷰 (정적 시안)
  return (
    <div className={s.rcard}>
      <div>
        <div className={s.rcardEyebrow}>Sample Analysis</div>
        <div className={s.rcardTitle} style={{ marginTop: "4px" }}>이런 형태로 결과가 제공됩니다</div>
        <div className={s.rcardAddr}>서울특별시 강남구 역삼동 826-22, 3층 301호</div>
      </div>

      {/* 점수 + 판정 */}
      <div className={s.scoreRow}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div className={s.gaugeWrap}>
            <svg width="130" height="130" viewBox="0 0 156 156">
              <circle cx="78" cy="78" r="58" fill="none" stroke="#f0f2f6" strokeWidth="13" />
              <circle cx="78" cy="78" r="58" fill="none" stroke="#f59e0b" strokeWidth="13"
                strokeDasharray="226.2 364.4" strokeLinecap="round" transform="rotate(-90 78 78)" />
            </svg>
            <div className={s.gaugeMid}>
              <div className={s.gaugeN}>62</div>
              <div className={s.gaugeU}>/ 100점</div>
            </div>
          </div>
          <div>
            <span className={s.gaugeGrade} style={{ color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a" }}>
              ⚠ 주의 필요
            </span>
          </div>
        </div>
        <div className={s.scoreMeta}>
          <div className={s.scoreVerdict}>권리관계 주의 — 계약 전 확인 필요</div>
          <div style={{ fontSize: "12.5px", color: "#999", marginBottom: "10px" }}>
            예시 데이터 · 갑구 3건 / 을구 2건
          </div>
          <div className={s.scoreBadges}>
            <span className={`${s.sbadge} ${s.sbadgeD}`}>⚠ 근저당 1건</span>
            <span className={`${s.sbadge} ${s.sbadgeW}`}>! 가처분 확인 필요</span>
            <span className={`${s.sbadge} ${s.sbadgeS}`}>✓ 소유자 일치</span>
            <span className={`${s.sbadge} ${s.sbadgeS}`}>✓ 예고등기 없음</span>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className={s.kpiRow}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>선순위채권 총액</div>
          <div className={s.kpiVal}>1<span className={s.kpiUnit}>억 2천</span></div>
          <div className={s.kpiTag} style={{ color: "#b45309" }}>시세 대비 15%</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>소유자 수</div>
          <div className={s.kpiVal}>1<span className={s.kpiUnit}>인</span></div>
          <div className={s.kpiTag} style={{ color: "#15803d" }}>단독 소유</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>위험 등기</div>
          <div className={s.kpiVal}>1<span className={s.kpiUnit}>건</span></div>
          <div className={s.kpiTag} style={{ color: "#b45309" }}>근저당 주의</div>
        </div>
      </div>

      {/* 갑구 분석 */}
      <div className={s.regSection}>
        <div className={s.regSecHead}>
          <span className={`${s.regSecBadge} ${s.badgeGab}`}>갑구</span>
          <span className={s.regSecTitle}>소유권에 관한 사항</span>
          <span className={s.regSecSub}>3건</span>
        </div>
        <div className={s.regItems}>
          <div className={`${s.ri} ${s.riS}`}>
            <div className={`${s.riDot} ${s.dotS}`}></div>
            <div style={{ flex: 1 }}>
              <div className={s.riLabel}>소유권이전 — 김○○ (매매, 2021.03.15)</div>
              <div className={s.riDetail}>현재 소유자 확인 · 등기부상 소유자와 매도인 일치</div>
            </div>
            <span className={s.riBadge}>안전</span>
          </div>
          <div className={`${s.ri} ${s.riW}`}>
            <div className={`${s.riDot} ${s.dotW}`}></div>
            <div style={{ flex: 1 }}>
              <div className={s.riLabel}>가처분 — 박○○ (2023.07.22)</div>
              <div className={s.riDetail}>소유권 이전 제한 가처분 · 말소 여부 법원 확인 필요</div>
            </div>
            <span className={s.riBadge}>주의</span>
          </div>
          <div className={`${s.ri} ${s.riS}`}>
            <div className={`${s.riDot} ${s.dotS}`}></div>
            <div style={{ flex: 1 }}>
              <div className={s.riLabel}>압류 없음 · 예고등기 없음</div>
              <div className={s.riDetail}>경매개시결정·신탁등기·가등기 없음</div>
            </div>
            <span className={s.riBadge}>안전</span>
          </div>
        </div>
      </div>

      {/* 을구 분석 */}
      <div className={s.regSection}>
        <div className={s.regSecHead}>
          <span className={`${s.regSecBadge} ${s.badgeEul}`}>을구</span>
          <span className={s.regSecTitle}>소유권 외의 권리에 관한 사항</span>
          <span className={s.regSecSub}>2건</span>
        </div>
        <div className={s.regItems}>
          <div className={`${s.ri} ${s.riW}`}>
            <div className={`${s.riDot} ${s.dotW}`}></div>
            <div style={{ flex: 1 }}>
              <div className={s.riLabel}>근저당권 — ○○은행 채권최고액 1억 4,400만 원 (2021.03.15)</div>
              <div className={s.riDetail}>실제 대출 추정 1억 2,000만 원 · 잔금 시 말소 특약 확인 필요</div>
            </div>
            <span className={s.riBadge}>주의</span>
          </div>
          <div className={`${s.ri} ${s.riS}`}>
            <div className={`${s.riDot} ${s.dotS}`}></div>
            <div style={{ flex: 1 }}>
              <div className={s.riLabel}>전세권 없음 · 지상권 없음</div>
              <div className={s.riDetail}>추가 담보권 설정 없음</div>
            </div>
            <span className={s.riBadge}>안전</span>
          </div>
        </div>
      </div>

      {/* AI 권고 */}
      <div className={s.aiBox}>
        <span className={s.aiIco}>✦</span>
        <p className={s.aiTxt}>
          갑구의 가처분 등기가 확인됩니다. 잔금 전 법원에서 가처분 취소·말소 여부를 반드시 확인하세요.
          을구의 근저당은 잔금 시 동시 말소 특약을 계약서에 명시하면 안전하게 거래할 수 있습니다.
        </p>
      </div>

      <div className={s.rnote}>
        ※ 위 결과는 시안 예시입니다. 좌측에 주소를 입력하거나 등기부를 업로드하면 실제 분석이 시작됩니다.
      </div>
    </div>
  );
}
