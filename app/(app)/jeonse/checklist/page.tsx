"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Download, RotateCcw } from "lucide-react";

/* ── 체크리스트 데이터 ── */

type DealType = "전세" | "매매" | "월세";
type PropertyType = "아파트" | "빌라" | "오피스텔";
type Stage = "계약 전" | "계약 중" | "계약 후" | "입주 전" | "입주 후";

interface CheckItem {
  id: string;
  label: string;
  description?: string;
}

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

/* ── 스토리지 헬퍼 ── */

const STORAGE_KEY = "vestra-checklist-state";

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveChecked(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

/* ── 페이지 컴포넌트 ── */

export default function ChecklistPage() {
  const [dealType, setDealType] = useState<DealType>("전세");
  const [propertyType, setPropertyType] = useState<PropertyType>("아파트");
  const [stage, setStage] = useState<Stage>("계약 전");
  const [items, setItems] = useState<CheckItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [generated, setGenerated] = useState(false);

  /* localStorage 초기 로드 */
  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  /* checked 변경 시 저장 */
  useEffect(() => {
    if (Object.keys(checked).length > 0) {
      saveChecked(checked);
    }
  }, [checked]);

  const handleGenerate = () => {
    const list = CHECKLIST_DATA[dealType]?.[stage] ?? [];
    setItems(list);
    setGenerated(true);
  };

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      return next;
    });
  }, []);

  const resetChecklist = () => {
    const resetState = { ...checked };
    items.forEach((item) => {
      delete resetState[item.id];
    });
    setChecked(resetState);
    saveChecked(resetState);
  };

  const completedCount = items.filter((i) => checked[i.id]).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const selectClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">계약 체크리스트</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          전세/매매 계약 전후 필수 확인사항을 자동 생성합니다
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">계약 정보</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">거래 유형</label>
            <select value={dealType} onChange={(e) => setDealType(e.target.value as DealType)} className={selectClass}>
              <option value="전세">전세</option>
              <option value="매매">매매</option>
              <option value="월세">월세</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">물건 유형</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)} className={selectClass}>
              <option value="아파트">아파트</option>
              <option value="빌라">빌라</option>
              <option value="오피스텔">오피스텔</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">계약 단계</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className={selectClass}>
              <option value="계약 전">계약 전</option>
              <option value="계약 중">계약 중</option>
              <option value="계약 후">계약 후</option>
              <option value="입주 전">입주 전</option>
              <option value="입주 후">입주 후</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto sm:px-8"
        >
          체크리스트 생성
        </button>
      </div>

      {/* 결과 */}
      {generated && (
        <>
          {items.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
              <p className="text-sm text-gray-500">해당 조합에 대한 체크리스트가 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 프로그레스 요약 */}
              <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">
                      {dealType} · {propertyType} · {stage}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {completedCount}/{totalCount}개 완료
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
                    <div className="flex gap-2">
                      <button
                        onClick={resetChecklist}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <RotateCcw className="h-3 w-3" /> 초기화
                      </button>
                      <button
                        onClick={() => alert("PDF 저장 기능은 준비 중입니다.")}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <Download className="h-3 w-3" /> PDF 저장
                      </button>
                    </div>
                  </div>
                </div>

                {/* 프로그레스 바 */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* 체크리스트 아이템 */}
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                        isChecked
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-white hover:border-indigo-300"
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                            isChecked
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {isChecked && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isChecked ? "text-green-700 line-through" : "text-gray-900"}`}>
                          <span className="mr-2 text-xs text-gray-400">{idx + 1}.</span>
                          {item.label}
                        </p>
                        {item.description && (
                          <p className={`mt-0.5 text-xs ${isChecked ? "text-green-500" : "text-gray-500"}`}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 안내 */}
              <p className="text-center text-xs text-gray-400">
                체크 상태는 브라우저에 자동 저장됩니다. 본 체크리스트는 참고용이며, 실제 계약 시 전문가 상담을 권장합니다.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
