"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ClipboardCheck, Download, RotateCcw, ChevronRight, CheckCircle2, ListChecks, TrendingUp, HardDrive, RefreshCw, Home, Key, FileText, type LucideIcon } from "lucide-react";

/* ── 타입 ── */

type DealType = "전세" | "매매" | "월세";
type Stage = "계약 전" | "계약 중" | "계약 후" | "입주 전" | "입주 후";

interface CheckItem {
  id: string;
  label: string;
  description?: string;
}

/* ── 체크리스트 데이터 ── */

const CHECKLIST_DATA: Record<DealType, Partial<Record<Stage, CheckItem[]>>> = {
  전세: {
    "계약 전": [
      { id: "js-pre-1", label: "등기부등본 확인 (근저당, 가압류, 소유권)", description: "등기부등본 갑구/을구를 확인하여 소유권 이전, 가압류, 근저당 설정 여부를 점검합니다." },
      { id: "js-pre-2", label: "건물 관리사무소 방문 (관리비, 하자 이력)", description: "미납 관리비, 장기수선충당금, 하자보수 이력 등을 확인합니다." },
      { id: "js-pre-3", label: "전입세대 확인 (세대 열람 동의)", description: "기존 세입자의 전입 여부와 보증금 반환 상태를 확인합니다." },
      { id: "js-pre-4", label: "임대인 신분증 확인 (본인 여부)", description: "등기부상 소유자와 계약 당사자가 동일인인지 확인합니다." },
      { id: "js-pre-5", label: "보증금 대비 매매가 비율 확인 (깡통전세 위험)", description: "보증금이 매매가의 70% 이상이면 깡통전세 위험이 높습니다." },
      { id: "js-pre-6", label: "HUG/SGI 보증보험 가입 가능 여부 확인", description: "전세보증금 반환보증 가입 가능 여부를 사전에 확인합니다." },
      { id: "js-pre-7", label: "확정일자 부여 가능 여부 확인", description: "주민센터에서 확정일자를 받을 수 있는지 확인합니다." },
      { id: "js-pre-8", label: "주변 시세 조사 및 비교", description: "국토부 실거래가, 네이버 부동산 등으로 적정 시세를 확인합니다." },
      { id: "js-pre-9", label: "중개사 자격 및 공제증서 확인", description: "공인중개사 자격증과 중개사고 공제증서를 확인합니다." },
    ],
    "계약 중": [
      { id: "js-mid-1", label: "특약사항 기재 확인", description: "보증금 반환 조건, 수리 범위 등 특약사항을 명확히 기재합니다." },
      { id: "js-mid-2", label: "계약금 입금 전 등기부 재확인", description: "계약금 입금 직전에 등기부등본을 다시 확인하여 권리 변동이 없는지 점검합니다." },
      { id: "js-mid-3", label: "임대인 계좌 본인 명의 확인", description: "보증금 입금 계좌가 임대인 본인 명의인지 확인합니다." },
      { id: "js-mid-4", label: "중개 수수료 및 부담 주체 협의", description: "중개보수 요율과 부담 주체를 미리 협의합니다." },
      { id: "js-mid-5", label: "잔금일 및 입주일 명시", description: "잔금 지급일과 입주 가능일을 계약서에 명확히 기재합니다." },
    ],
    "계약 후": [
      { id: "js-post-1", label: "전입신고 (14일 이내)", description: "입주 후 14일 이내에 전입신고를 완료하여 대항력을 확보합니다." },
      { id: "js-post-2", label: "확정일자 받기", description: "주민센터에서 확정일자를 받아 우선변제권을 확보합니다." },
      { id: "js-post-3", label: "전세권설정등기 검토", description: "보증금 규모가 클 경우 전세권설정등기를 검토합니다." },
      { id: "js-post-4", label: "보증보험 가입", description: "HUG 또는 SGI 전세보증금 반환보증에 가입합니다." },
      { id: "js-post-5", label: "계약서 사본 보관", description: "계약서 원본과 사본을 안전한 곳에 보관합니다." },
      { id: "js-post-6", label: "등기부등본 재발급 및 보관", description: "계약 후 변경된 등기부등본을 재발급받아 보관합니다." },
    ],
    "입주 전": [
      { id: "js-movein-pre-1", label: "잔금 입금 전 등기부 최종 확인", description: "잔금 입금 직전 등기부등본을 최종 확인합니다." },
      { id: "js-movein-pre-2", label: "시설물 상태 점검 (수도, 전기, 가스)", description: "입주 전 주요 시설물의 작동 상태를 점검합니다." },
      { id: "js-movein-pre-3", label: "하자 사진 촬영 및 기록", description: "기존 하자를 사진으로 기록하여 퇴거 시 분쟁을 방지합니다." },
      { id: "js-movein-pre-4", label: "도시가스 및 수도 명의 변경", description: "가스, 수도, 전기 등 공과금 명의를 변경합니다." },
      { id: "js-movein-pre-5", label: "관리사무소에 입주 사실 통보", description: "관리사무소에 입주 사실을 알리고 관리비 정산을 확인합니다." },
    ],
    "입주 후": [
      { id: "js-movein-post-1", label: "전입신고 완료 여부 재확인", description: "전입신고가 정상 처리되었는지 주민센터에서 확인합니다." },
      { id: "js-movein-post-2", label: "확정일자 취득 여부 확인", description: "확정일자가 정상적으로 부여되었는지 확인합니다." },
      { id: "js-movein-post-3", label: "보증보험 가입 완료 확인", description: "보증보험 증서를 수령하고 보관합니다." },
      { id: "js-movein-post-4", label: "우편물 주소 변경", description: "금융기관, 카드사 등에 주소 변경을 신청합니다." },
      { id: "js-movein-post-5", label: "비상 연락처 확인 (관리사무소, 임대인)", description: "긴급 상황을 대비한 연락처를 정리합니다." },
    ],
  },
  매매: {
    "계약 전": [
      { id: "mm-pre-1", label: "등기부등본 확인", description: "소유권, 근저당, 가압류, 가등기 등 권리관계를 확인합니다." },
      { id: "mm-pre-2", label: "건축물대장 확인", description: "건축물의 용도, 면적, 위반건축물 여부를 확인합니다." },
      { id: "mm-pre-3", label: "토지이용계획 확인", description: "용도지역, 개발 제한 여부, 도시계획 등을 확인합니다." },
      { id: "mm-pre-4", label: "실거래가 비교", description: "국토부 실거래가 시스템으로 주변 거래가격을 비교합니다." },
      { id: "mm-pre-5", label: "취득세 계산", description: "취득세율(1~12%)과 예상 세액을 미리 계산합니다." },
      { id: "mm-pre-6", label: "대출 사전 심사", description: "주택담보대출 한도와 금리를 사전에 확인합니다." },
      { id: "mm-pre-7", label: "중개사 자격 및 공제증서 확인", description: "공인중개사 자격증과 공제증서를 확인합니다." },
      { id: "mm-pre-8", label: "매도인 신원 확인", description: "등기부상 소유자와 매도인이 동일인인지 확인합니다." },
      { id: "mm-pre-9", label: "주변 개발 계획 조사", description: "재개발, 재건축, 교통 인프라 등 개발 호재를 확인합니다." },
    ],
    "계약 중": [
      { id: "mm-mid-1", label: "계약서 특약사항 협의", description: "하자 보수, 인도일, 위약금 등 특약사항을 협의합니다." },
      { id: "mm-mid-2", label: "계약금 지급 전 등기부 재확인", description: "계약금 지급 직전 권리 변동을 재확인합니다." },
      { id: "mm-mid-3", label: "매도인 본인 계좌 확인", description: "대금 지급 계좌가 매도인 본인 명의인지 확인합니다." },
      { id: "mm-mid-4", label: "중도금 지급 일정 확인", description: "중도금 지급 일정과 조건을 명확히 합니다." },
      { id: "mm-mid-5", label: "잔금일 및 소유권 이전 일정 확인", description: "잔금 지급일과 소유권 이전등기 일정을 협의합니다." },
    ],
    "계약 후": [
      { id: "mm-post-1", label: "소유권 이전등기 신청", description: "법무사를 통해 소유권 이전등기를 신청합니다." },
      { id: "mm-post-2", label: "취득세 납부", description: "취득 후 60일 이내에 취득세를 신고·납부합니다." },
      { id: "mm-post-3", label: "등기권리증 수령 및 보관", description: "등기필증(등기권리증)을 수령하여 안전하게 보관합니다." },
      { id: "mm-post-4", label: "주택 화재보험 가입", description: "화재보험 및 필요 시 종합보험에 가입합니다." },
      { id: "mm-post-5", label: "전입신고 및 주소 변경", description: "새 주소로 전입신고를 완료합니다." },
      { id: "mm-post-6", label: "재산세 부과 기준 확인", description: "재산세 부과 기준일과 납부 일정을 확인합니다." },
    ],
    "입주 전": [
      { id: "mm-movein-pre-1", label: "잔금 입금 및 소유권 이전 확인", description: "잔금을 지급하고 등기부에 소유권 이전이 완료되었는지 확인합니다." },
      { id: "mm-movein-pre-2", label: "시설물 인수 점검", description: "수도, 전기, 가스, 보일러 등 주요 시설물을 점검합니다." },
      { id: "mm-movein-pre-3", label: "하자 보수 요청", description: "발견된 하자에 대해 매도인에게 보수를 요청합니다." },
      { id: "mm-movein-pre-4", label: "공과금 명의 변경", description: "전기, 가스, 수도 등 공과금 명의를 변경합니다." },
      { id: "mm-movein-pre-5", label: "관리사무소 입주 신고", description: "관리사무소에 입주 사실을 알리고 필요 서류를 제출합니다." },
    ],
    "입주 후": [
      { id: "mm-movein-post-1", label: "전입신고 완료 확인", description: "전입신고가 정상적으로 처리되었는지 확인합니다." },
      { id: "mm-movein-post-2", label: "등기부등본 최종 확인", description: "소유권 이전이 정상 완료되었는지 최종 확인합니다." },
      { id: "mm-movein-post-3", label: "양도소득세 신고 일정 확인 (매도인)", description: "추후 매도 시 양도세 비과세 요건을 확인합니다." },
      { id: "mm-movein-post-4", label: "주택 종합보험 가입 확인", description: "화재보험 등 필수 보험의 가입 여부를 점검합니다." },
      { id: "mm-movein-post-5", label: "우편물 주소 변경 신청", description: "금융기관, 카드사, 관공서 등에 주소 변경을 알립니다." },
    ],
  },
  월세: {
    "계약 전": [
      { id: "ws-pre-1", label: "등기부등본 확인 (근저당, 가압류, 소유권)", description: "등기부등본으로 권리관계를 확인합니다." },
      { id: "ws-pre-2", label: "임대인 신분증 및 소유자 일치 확인", description: "등기부상 소유자와 임대인이 동일인인지 확인합니다." },
      { id: "ws-pre-3", label: "주변 월세 시세 조사", description: "인근 유사 물건의 월세 시세를 비교합니다." },
      { id: "ws-pre-4", label: "관리비 항목 및 금액 확인", description: "관리비에 포함되는 항목과 별도 부과 항목을 확인합니다." },
      { id: "ws-pre-5", label: "중개사 자격 확인", description: "공인중개사 자격증과 공제증서를 확인합니다." },
      { id: "ws-pre-6", label: "보증금 보호 방법 확인", description: "전입신고 + 확정일자로 보증금 보호가 가능한지 확인합니다." },
      { id: "ws-pre-7", label: "월세 세액공제 가능 여부 확인", description: "연소득 기준 월세 세액공제 가능 여부를 확인합니다." },
    ],
    "계약 중": [
      { id: "ws-mid-1", label: "특약사항 기재 (수리, 월세 인상 제한 등)", description: "수리 범위, 월세 인상 제한 등을 특약으로 기재합니다." },
      { id: "ws-mid-2", label: "보증금 입금 계좌 본인 확인", description: "보증금 입금 계좌가 임대인 본인 명의인지 확인합니다." },
      { id: "ws-mid-3", label: "월세 지급 방법 및 일자 협의", description: "월세 자동이체 등 지급 방법과 날짜를 협의합니다." },
      { id: "ws-mid-4", label: "계약 기간 및 갱신 조건 확인", description: "계약 기간과 갱신 시 조건 변경 여부를 확인합니다." },
    ],
    "계약 후": [
      { id: "ws-post-1", label: "전입신고 (14일 이내)", description: "입주 후 14일 이내에 전입신고를 완료합니다." },
      { id: "ws-post-2", label: "확정일자 받기", description: "주민센터에서 확정일자를 받아 보증금 보호를 강화합니다." },
      { id: "ws-post-3", label: "월세 이체 내역 보관", description: "세액공제를 위해 월세 이체 내역을 보관합니다." },
      { id: "ws-post-4", label: "계약서 사본 보관", description: "계약서 원본과 사본을 안전하게 보관합니다." },
      { id: "ws-post-5", label: "임대차신고 (보증금 6천만원 이상)", description: "보증금 6천만원 이상 시 임대차 신고를 합니다." },
    ],
    "입주 전": [
      { id: "ws-movein-pre-1", label: "시설물 상태 점검 (수도, 전기, 가스)", description: "주요 시설물의 작동 상태를 점검합니다." },
      { id: "ws-movein-pre-2", label: "하자 사진 촬영 및 기록", description: "기존 하자를 기록하여 퇴거 시 분쟁을 방지합니다." },
      { id: "ws-movein-pre-3", label: "공과금 명의 변경", description: "전기, 가스, 수도 등 명의를 변경합니다." },
      { id: "ws-movein-pre-4", label: "관리사무소 입주 통보", description: "관리사무소에 입주 사실을 알립니다." },
    ],
    "입주 후": [
      { id: "ws-movein-post-1", label: "전입신고 완료 확인", description: "전입신고가 정상 처리되었는지 확인합니다." },
      { id: "ws-movein-post-2", label: "확정일자 취득 확인", description: "확정일자가 정상 부여되었는지 확인합니다." },
      { id: "ws-movein-post-3", label: "월세 자동이체 설정", description: "월세 자동이체를 설정하고 정상 작동을 확인합니다." },
      { id: "ws-movein-post-4", label: "비상 연락처 정리", description: "관리사무소, 임대인 연락처를 정리합니다." },
      { id: "ws-movein-post-5", label: "월세 세액공제 관련 서류 준비", description: "연말정산 시 필요한 서류(계약서, 이체내역 등)를 준비합니다." },
    ],
  },
};

/* ── 단계별 색상 ── */

const STAGE_META: Record<Stage, { color: string; bg: string; label: string }> = {
  "계약 전":  { color: "#0071e3", bg: "rgba(0,113,227,0.10)",  label: "계약 전" },
  "계약 중":  { color: "#b86f00", bg: "rgba(255,159,10,0.10)", label: "계약 중" },
  "계약 후":  { color: "#1a9e45", bg: "rgba(48,209,88,0.10)",  label: "계약 후" },
  "입주 전":  { color: "#6e3de8", bg: "rgba(110,61,232,0.10)", label: "입주 전" },
  "입주 후":  { color: "#636366", bg: "rgba(99,99,102,0.10)",  label: "입주 후" },
};

const DEAL_META: Record<DealType, { color: string; bg: string; icon: LucideIcon }> = {
  전세: { color: "#0071e3", bg: "rgba(0,113,227,0.10)", icon: Home },
  매매: { color: "#1a9e45", bg: "rgba(48,209,88,0.10)", icon: Key },
  월세: { color: "#b86f00", bg: "rgba(255,159,10,0.10)", icon: FileText },
};

const FEATURE_CHIPS: { icon: LucideIcon; label: string }[] = [
  { icon: ListChecks,  label: "단계별 체크리스트" },
  { icon: TrendingUp,  label: "진행률 자동 계산" },
  { icon: HardDrive,   label: "브라우저 자동 저장" },
  { icon: RefreshCw,   label: "전세·매매·월세" },
];

/* ── 스토리지 헬퍼 ── */

const STORAGE_KEY = "vestra-checklist-state";

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function saveChecked(state: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota exceeded */ }
}

/* ── 페이지 ── */

export default function ChecklistPage() {
  const [dealType, setDealType] = useState<DealType>("전세");
  const [stage, setStage] = useState<Stage>("계약 전");
  const [items, setItems] = useState<CheckItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecked());
  const [generated, setGenerated] = useState(false);
  useEffect(() => {
    saveChecked(checked);
  }, [checked]);

  const handleGenerate = () => {
    setItems(CHECKLIST_DATA[dealType]?.[stage] ?? []);
    setGenerated(true);
  };

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  }, []);

  const resetChecklist = () => {
    const next = { ...checked };
    items.forEach((item) => delete next[item.id]);
    setChecked(next);
    saveChecked(next);
  };

  const completedCount = items.filter((i) => checked[i.id]).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const stageMeta = STAGE_META[stage];
  const dealMeta = DEAL_META[dealType];

  const DEAL_TYPES: DealType[] = ["전세", "매매", "월세"];
  const STAGES: Stage[] = ["계약 전", "계약 중", "계약 후", "입주 전", "입주 후"];

  return (
    <div style={{ paddingBottom: "48px" }}>

      {/* ── 히어로 배너 ── */}
      <section
        style={{
          position: "relative", overflow: "hidden", borderRadius: "28px",
          background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
          marginTop: "10px", marginBottom: "28px",
        }}
      >
        <div style={{ pointerEvents: "none", position: "absolute", top: "-80px", right: "-20px", height: "320px", width: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "36px 44px", gap: "24px" }}>
          <div>
            <nav style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
              <Link href="/jeonse" style={{ fontSize: "11px", color: "rgba(41,151,255,0.80)", textDecoration: "none", fontWeight: 500 }}>전세보호</Link>
              <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.25)" }} strokeWidth={2} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>계약 체크리스트</span>
            </nav>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 11px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "14px" }}>
              📋 체크리스트
            </div>
            <h1 style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
              계약 체크리스트
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.42)", marginTop: "8px", marginBottom: 0 }}>
              전세·매매·월세 계약 단계별 필수 확인사항을<br />자동으로 생성하고 진행률을 추적합니다.
            </p>
          </div>
          <div className="hidden md:flex" style={{ flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {FEATURE_CHIPS.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", minWidth: "180px" }}>
                <Icon size={15} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.70)", flexShrink: 0 }} />
                <span style={{ fontSize: "12.5px", fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 필터 카드 ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px", marginBottom: "16px" }}>
        {/* 거래 유형 */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "10px" }}>거래 유형</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
            {DEAL_TYPES.map((dt) => {
              const active = dealType === dt;
              const meta = DEAL_META[dt];
              const DtIcon = meta.icon;
              return (
                <button
                  key={dt}
                  onClick={() => { setDealType(dt); setGenerated(false); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 18px", borderRadius: "20px", border: "none", cursor: "pointer",
                    fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
                    background: active ? meta.color : "rgba(0,0,0,0.04)",
                    color: active ? "#fff" : "#6e6e73",
                    boxShadow: active ? `0 2px 12px ${meta.color}44` : "none",
                  }}
                >
                  <DtIcon size={14} strokeWidth={1.5} />{dt}
                </button>
              );
            })}
          </div>
        </div>

        {/* 계약 단계 */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "10px" }}>계약 단계</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
            {STAGES.map((s) => {
              const active = stage === s;
              const meta = STAGE_META[s];
              return (
                <button
                  key={s}
                  onClick={() => { setStage(s); setGenerated(false); }}
                  style={{
                    padding: "7px 16px", borderRadius: "20px", border: "none", cursor: "pointer",
                    fontSize: "12.5px", fontWeight: 600, transition: "all 0.15s",
                    background: active ? meta.bg : "rgba(0,0,0,0.04)",
                    color: active ? meta.color : "#6e6e73",
                    outline: active ? `1.5px solid ${meta.color}55` : "none",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "11px 28px", borderRadius: "12px", border: "none", cursor: "pointer",
            background: "#0071e3", color: "#fff", fontSize: "13.5px", fontWeight: 600,
            boxShadow: "0 2px 12px rgba(0,113,227,0.30)", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0077ed"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,113,227,0.40)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0071e3"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,113,227,0.30)"; }}
        >
          <ClipboardCheck size={15} strokeWidth={2} />
          체크리스트 생성
        </button>
      </div>

      {/* ── 결과 영역 ── */}
      {generated && (
        <>
          {items.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", padding: "40px 24px", textAlign: "center" as const }}>
              <p style={{ fontSize: "14px", color: "#aeaeb2" }}>해당 조합에 대한 체크리스트가 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 진행률 카드 */}
              <div
                style={{
                  background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  padding: "24px", marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" as const }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", color: dealMeta.color, background: dealMeta.bg }}>{dealType}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px", color: stageMeta.color, background: stageMeta.bg }}>{stage}</span>
                    <span style={{ fontSize: "13px", color: "#6e6e73" }}>{totalCount}개 항목</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={resetChecklist}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.10)", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "#6e6e73", transition: "all 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f7"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                    >
                      <RotateCcw size={12} strokeWidth={2} /> 초기화
                    </button>
                    <button
                      disabled
                      title="PDF 저장 기능은 준비 중입니다"
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "10px", border: "none", background: "rgba(0,113,227,0.35)", cursor: "not-allowed", fontSize: "12px", fontWeight: 600, color: "#fff", transition: "all 0.15s" }}
                    >
                      <Download size={12} strokeWidth={2} /> PDF 저장
                    </button>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ flex: 1, height: "6px", borderRadius: "9999px", background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%", borderRadius: "9999px", transition: "width 0.4s ease",
                        width: `${progress}%`,
                        background: progress === 100
                          ? "linear-gradient(90deg, #1a9e45, #30d158)"
                          : "linear-gradient(90deg, #0071e3, #2997ff)",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: progress === 100 ? "#1a9e45" : "#0071e3", minWidth: "48px", textAlign: "right" as const }}>
                    {progress}%
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#aeaeb2", marginTop: "8px" }}>
                  {completedCount}/{totalCount}개 완료
                  {progress === 100 && <span style={{ color: "#1a9e45", fontWeight: 600, marginLeft: "6px" }}>· 모든 항목 완료!</span>}
                </p>
              </div>

              {/* 체크리스트 아이템 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item, idx) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "14px",
                        width: "100%", textAlign: "left" as const, cursor: "pointer",
                        background: isChecked ? "rgba(48,209,88,0.05)" : "#fff",
                        border: isChecked ? "1px solid rgba(48,209,88,0.25)" : "1px solid rgba(0,0,0,0.08)",
                        borderRadius: "16px",
                        boxShadow: isChecked ? "none" : "0 1px 6px rgba(0,0,0,0.04)",
                        padding: "16px 18px",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isChecked) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,113,227,0.25)"; }}
                      onMouseLeave={(e) => { if (!isChecked) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.08)"; }}
                    >
                      {/* 체크 원형 */}
                      <div style={{ flexShrink: 0, marginTop: "1px" }}>
                        {isChecked ? (
                          <CheckCircle2 size={22} style={{ color: "#30d158" }} strokeWidth={2} />
                        ) : (
                          <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1.5px solid #c7c7cc", background: "#fff" }} />
                        )}
                      </div>

                      {/* 텍스트 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: item.description ? "4px" : 0 }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: isChecked ? "#30d158" : stageMeta.color, background: isChecked ? "rgba(48,209,88,0.10)" : stageMeta.bg, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p style={{ fontSize: "13.5px", fontWeight: 600, color: isChecked ? "#aeaeb2" : "#1d1d1f", textDecoration: isChecked ? "line-through" : "none", margin: 0, lineHeight: 1.4 }}>
                            {item.label}
                          </p>
                        </div>
                        {item.description && (
                          <p style={{ fontSize: "12px", lineHeight: 1.65, color: isChecked ? "#c7c7cc" : "#6e6e73", margin: 0, paddingLeft: "36px" }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 안내 */}
              <p style={{ textAlign: "center" as const, fontSize: "11.5px", color: "#aeaeb2", marginTop: "20px", lineHeight: 1.65 }}>
                체크 상태는 브라우저에 자동 저장됩니다. 본 체크리스트는 참고용이며, 실제 계약 시 전문가 상담을 권장합니다.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
