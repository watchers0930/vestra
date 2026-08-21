"use client";

import { useRef } from "react";
import { Shield, FileText, CheckCircle, AlertTriangle, Loader2, Paperclip } from "lucide-react";
import { useJeonseAnalysis } from "@/app/(app)/jeonse/analysis/hooks/useJeonseAnalysis";
import { propertyTypes } from "@/app/(app)/jeonse/analysis/constants";
import FraudRiskCard from "@/components/results/FraudRiskCard";
import { GuaranteeInsuranceCard } from "@/components/results";
import { KaptInfoCard } from "@/components/common/KaptInfoCard";
import LandlordTracker from "@/components/landlord/LandlordTracker";
import s from "../jeonse-renewal.module.css";

const NEEDS_STYLE: Record<string, { color: string; bg: string; text: string }> = {
  required: { color: "#ff3b30", bg: "rgba(255,59,48,0.10)", text: "설정 필수" },
  recommended: { color: "#b86f00", bg: "rgba(255,159,10,0.10)", text: "설정 권고" },
  optional: { color: "#1a9e45", bg: "rgba(48,209,88,0.10)", text: "선택 사항" },
};
const RISK_STYLE: Record<string, { color: string; bg: string; text: string }> = {
  high: { color: "#ff3b30", bg: "rgba(255,59,48,0.10)", text: "고위험" },
  medium: { color: "#b86f00", bg: "rgba(255,159,10,0.10)", text: "중간" },
  low: { color: "#1a9e45", bg: "rgba(48,209,88,0.10)", text: "저위험" },
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12.5px", fontWeight: 600, color: "#1a1d2e", marginBottom: "8px" };
const inputStyle: React.CSSProperties = { width: "100%", height: "44px", padding: "0 14px", border: "1.5px solid #d0d4e8", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", color: "#1a1d2e", background: "#fff", outline: "none" };

const fmtWon = (n: number) => (n ? n.toLocaleString("ko-KR") : "");
const parseWon = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;
const scColor = (v: number) => (v >= 80 ? "#1a9e45" : v >= 60 ? "#0071e3" : v >= 40 ? "#b86f00" : "#ff3b30");

export function JeonseSafetyAnalysis() {
  const {
    formData, setFormData,
    loading, analysis,
    fraudRisk, fraudLoading,
    guaranteeResult, kaptInfo,
    checklist, setChecklist,
    registryLoading, parsedOwner,
    resultRef,
    handleAnalyze, handleRegistryUpload,
  } = useJeonseAnalysis();

  const fileRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<typeof formData>) => setFormData({ ...formData, ...patch });

  // 집합건물(아파트·빌라/다세대·오피스텔)은 동/호수 상세주소 필수
  const AGGREGATE_TYPES = ["아파트", "빌라/다세대", "오피스텔"];
  const isAggregate = AGGREGATE_TYPES.includes(formData.propertyType);
  const dongHoMissing = isAggregate && !formData.dongHo?.trim();

  const jeonseRatio = formData.propertyPrice > 0 ? Math.round((formData.deposit / formData.propertyPrice) * 100) : 0;
  const lienRatio = formData.propertyPrice > 0 ? Math.round((formData.seniorLiens / formData.propertyPrice) * 100) : 0;
  const safetyScore = fraudRisk ? Math.max(0, 100 - fraudRisk.fraudScore) : null;

  return (
    <div className={s.analysisGrid}>
      {/* ── 좌: 입력 ── */}
      <div className={`${s.analysisLeft} ${s.analysisSticky}`}>
        <div className={s.acard}>
          <p className={s.secEyebrow} style={{ marginBottom: "6px" }}>전세안전분석</p>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>계약 정보를 입력하세요</h2>

          {/* 등기부등본 업로드 */}
          <label style={labelStyle}>
            등기부등본 <span style={{ fontWeight: 400, color: "#8a90a6" }}>(PDF 업로드 시 주소·근저당 자동 입력)</span>
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px", marginBottom: "18px", border: "1.5px dashed #c4cce4", borderRadius: "10px", background: "#f9fafe", cursor: "pointer" }}
          >
            {registryLoading ? <Loader2 size={18} className="animate-spin" style={{ color: "#2e4bd8" }} /> : parsedOwner ? <CheckCircle size={18} style={{ color: "#1a9e45" }} /> : <Paperclip size={18} style={{ color: "#2e4bd8" }} />}
            <span style={{ fontSize: "13px", fontWeight: 500, color: registryLoading ? "#2e4bd8" : parsedOwner ? "#1a9e45" : "#3d3d3f" }}>
              {registryLoading ? "등기부등본 분석 중..." : parsedOwner ? `파싱 완료 — 소유자 ${parsedOwner}` : "등기부등본 PDF 업로드"}
            </span>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) handleRegistryUpload(e.target.files[0]); }} />

          {/* 주소 */}
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>부동산 주소</label>
            <input style={inputStyle} type="text" value={formData.propertyAddress} onChange={(e) => update({ propertyAddress: e.target.value })} placeholder="서울 강남구 역삼동 123-45 래미안" />
          </div>

          {/* 주택 유형 */}
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>주택 유형</label>
            <select style={inputStyle} value={formData.propertyType} onChange={(e) => update({ propertyType: e.target.value })}>
              {propertyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* 동/호수 — 집합건물만 필수 */}
          {isAggregate && (
            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                동 / 호수 <span style={{ color: "#ff3b30" }}>*</span>
                <span style={{ fontWeight: 400, color: "#8a90a6" }}> (집합건물 필수)</span>
              </label>
              <input
                style={dongHoMissing ? { ...inputStyle, border: "1.5px solid #ff3b30" } : inputStyle}
                type="text"
                value={formData.dongHo ?? ""}
                onChange={(e) => update({ dongHo: e.target.value })}
                placeholder="예: 101동 1502호"
              />
              {dongHoMissing && (
                <p style={{ fontSize: "11.5px", color: "#b45309", marginTop: "6px", lineHeight: 1.5 }}>
                  아파트·빌라/다세대·오피스텔은 등기·시세 조회 정확도를 위해 동/호수가 필요합니다.
                </p>
              )}
            </div>
          )}

          {/* 보증금 / 주택시세 / 선순위 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={labelStyle}>보증금</label>
              <input style={inputStyle} type="text" inputMode="numeric" value={fmtWon(formData.deposit)} onChange={(e) => update({ deposit: parseWon(e.target.value) })} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>주택시세</label>
              <input style={inputStyle} type="text" inputMode="numeric" value={fmtWon(formData.propertyPrice)} onChange={(e) => update({ propertyPrice: parseWon(e.target.value) })} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>선순위채권</label>
              <input style={inputStyle} type="text" inputMode="numeric" value={fmtWon(formData.seniorLiens)} onChange={(e) => update({ seniorLiens: parseWon(e.target.value) })} placeholder="0" />
            </div>
          </div>

          {/* 수도권 / 월세 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={labelStyle}>지역</label>
              <select style={inputStyle} value={String(formData.isMetro)} onChange={(e) => update({ isMetro: e.target.value === "true" })}>
                <option value="true">수도권</option>
                <option value="false">비수도권</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>월세 (없으면 0)</label>
              <input style={inputStyle} type="text" inputMode="numeric" value={fmtWon(formData.monthlyRent)} onChange={(e) => update({ monthlyRent: parseWon(e.target.value) })} placeholder="0" />
            </div>
          </div>

          {/* 계약기간 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={labelStyle}>계약 시작일</label>
              <input style={inputStyle} type="date" value={formData.startDate} onChange={(e) => update({ startDate: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>계약 종료일</label>
              <input style={inputStyle} type="date" value={formData.endDate} onChange={(e) => update({ endDate: e.target.value })} />
            </div>
          </div>

          {/* 전세자금대출 */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "11px 14px", borderRadius: "10px", border: "1px solid #e2e6f2", background: "#f9fafe", marginBottom: "18px" }}>
            <input type="checkbox" checked={formData.hasJeonseLoan} onChange={(e) => update({ hasJeonseLoan: e.target.checked })} style={{ width: "15px", height: "15px", accentColor: "#2e4bd8" }} />
            <span style={{ fontSize: "12.5px", color: "#3c3c43" }}>전세자금대출 연계 (HF 보증 판단용)</span>
          </label>

          <button
            className={s.analyzeBtn}
            onClick={handleAnalyze}
            disabled={!formData.propertyAddress || dongHoMissing || loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />분석 중...</> : <><Shield size={16} strokeWidth={2} />전세 안전 분석</>}
          </button>
        </div>
      </div>

      {/* ── 우: 결과 ── */}
      <div className={s.analysisRight}>
        {loading && (
          <div style={{ background: "#fff", border: "1px solid #e8eaf2", borderRadius: "16px", padding: "40px 24px", textAlign: "center" }}>
            <Loader2 size={26} className="animate-spin" style={{ color: "#2e4bd8", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1d2e" }}>전세 안전 분석 중...</p>
            <p style={{ fontSize: "12.5px", color: "#8a90a6", marginTop: "4px" }}>계약 정보·위험도·보증보험 가능 여부를 확인하고 있습니다</p>
          </div>
        )}

        {!loading && !analysis && (
          <div style={{ background: "#f9fafe", border: "1.5px dashed #d0d4e8", borderRadius: "16px", padding: "60px 24px", textAlign: "center" }}>
            <Shield size={34} strokeWidth={1.4} style={{ color: "#c4cce4", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#3d3d3f" }}>계약 정보를 입력하고 분석하세요</p>
            <p style={{ fontSize: "12.5px", color: "#8a90a6", marginTop: "4px" }}>전세가율·선순위·전세사기 위험도·보증보험 가입 가능성을<br />AI가 종합 분석합니다</p>
          </div>
        )}

        {analysis && !loading && (
          <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 안전점수 + KPI */}
            <div style={{ background: "#fff", border: "1px solid #e8eaf2", borderRadius: "16px", padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <div style={{ width: "108px", height: "108px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: safetyScore !== null ? `conic-gradient(${scColor(safetyScore)} ${safetyScore * 3.6}deg,#eef0f6 0deg)` : "#eef0f6" }}>
                  <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "26px", fontWeight: 800, color: safetyScore !== null ? scColor(safetyScore) : "#8a90a6", lineHeight: 1 }}>{safetyScore ?? (fraudLoading ? "…" : "-")}</span>
                    <span style={{ fontSize: "10.5px", color: "#8a90a6", marginTop: "2px" }}>안전점수</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: "180px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className={s.resultKpiCard}>
                    <div className={s.resultKpiLabel}>전세가율 (LTV)</div>
                    <div className={s.resultKpiVal}>{jeonseRatio}<span className={s.resultKpiUnit}>%</span></div>
                    <div className={s.resultKpiTag} style={{ color: jeonseRatio > 80 ? "#b91c1c" : "#15803d" }}>{jeonseRatio > 80 ? "기준(80%) 초과" : "안전 범위"}</div>
                  </div>
                  <div className={s.resultKpiCard}>
                    <div className={s.resultKpiLabel}>선순위 비율</div>
                    <div className={s.resultKpiVal}>{lienRatio}<span className={s.resultKpiUnit}>%</span></div>
                    <div className={s.resultKpiTag} style={{ color: lienRatio > 0 ? "#b45309" : "#15803d" }}>{lienRatio > 0 ? "선순위 채권 있음" : "선순위 없음"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 전세권 설정 판단 */}
            <div style={{ background: "#fff", border: `1px solid ${NEEDS_STYLE[analysis.needsRegistration]?.color ?? "#e8eaf2"}33`, borderRadius: "16px", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1d2e" }}>전세권 설정 판단</h4>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", color: NEEDS_STYLE[analysis.needsRegistration]?.color, background: NEEDS_STYLE[analysis.needsRegistration]?.bg }}>
                  {NEEDS_STYLE[analysis.needsRegistration]?.text}
                </span>
              </div>
              <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", marginBottom: "10px", color: RISK_STYLE[analysis.riskLevel]?.color, background: RISK_STYLE[analysis.riskLevel]?.bg }}>
                위험도: {RISK_STYLE[analysis.riskLevel]?.text}
              </span>
              <p style={{ fontSize: "13px", lineHeight: 1.65, color: "#6e6e73" }}>{analysis.reason}</p>
            </div>

            {/* 권고사항 */}
            <div style={{ background: "#fff", border: "1px solid #e8eaf2", borderRadius: "16px", padding: "20px 24px" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "15px", fontWeight: 700, color: "#1a1d2e", marginBottom: "14px" }}>
                <AlertTriangle size={16} strokeWidth={1.5} style={{ color: "#ff9f0a" }} />권고사항
              </h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0, margin: 0 }}>
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", lineHeight: 1.6 }}>
                    <CheckCircle size={15} strokeWidth={2} style={{ color: "#30d158", flexShrink: 0, marginTop: "2px" }} />
                    <span style={{ color: "#1a1d2e" }}>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 필요 서류 체크리스트 */}
            <div style={{ background: "#fff", border: "1px solid #e8eaf2", borderRadius: "16px", padding: "20px 24px" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "15px", fontWeight: 700, color: "#1a1d2e", marginBottom: "14px" }}>
                <FileText size={16} strokeWidth={1.5} style={{ color: "#6e6e73" }} />필요 서류 체크리스트
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {analysis.requiredDocuments.map((doc, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "10px", cursor: "pointer" }}>
                    <input type="checkbox" checked={checklist[doc.name] || false} onChange={(e) => setChecklist({ ...checklist, [doc.name]: e.target.checked })} style={{ width: "15px", height: "15px", accentColor: "#2e4bd8", marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1d2e" }}>{doc.name}</div>
                      <div style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "2px" }}>발급처: {doc.where}</div>
                      {doc.note && <div style={{ fontSize: "11px", color: "#aeaeb2", marginTop: "1px" }}>{doc.note}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* AI 종합 의견 */}
            <div style={{ background: "#fff", border: "1px solid rgba(46,75,216,0.18)", borderRadius: "16px", padding: "20px 24px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#2e4bd8", marginBottom: "10px" }}>AI 종합 의견</h4>
              <p style={{ fontSize: "13px", lineHeight: 1.75, color: "#1a1d2e" }}>{analysis.aiOpinion}</p>
            </div>

            {/* 공용 카드 재사용 */}
            {kaptInfo && <KaptInfoCard kaptInfo={kaptInfo} />}
            {fraudRisk && !fraudLoading && <FraudRiskCard result={fraudRisk} />}
            {guaranteeResult && <GuaranteeInsuranceCard result={guaranteeResult} formData={formData} />}
            <LandlordTracker ownerName={parsedOwner} baseAddress={formData.propertyAddress} />
          </div>
        )}
      </div>
    </div>
  );
}
