"use client";

import { useState } from "react";
import s from "../expert.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import type { ReservationFormState } from "@/app/(app)/expert-connect/hooks/useExpertConsult";
import { CONSULT_TYPES } from "@/app/(app)/expert-connect/constants";

// 상담신청과 동일한 방문 가능 시간대 — 오전 9시~오후 5시(12~2시 휴게 제외)
const TIME_SLOTS: [string, string][] = [
  ["09:00", "오전 9시"], ["10:00", "오전 10시"], ["11:00", "오전 11시"],
  ["14:00", "오후 2시"], ["15:00", "오후 3시"], ["16:00", "오후 4시"],
];

function fmtHourly(fee?: number | null) {
  if (fee == null) return "협의";
  if (fee === 0) return "무료";
  if (fee >= 10000) return `시간당 ${(fee / 10000).toLocaleString()}만원`;
  return `시간당 ${fee.toLocaleString()}원`;
}

interface VisitFormProps {
  selectedExpert: Expert | null;
  reservationForm: ReservationFormState;
  setReservationForm: React.Dispatch<React.SetStateAction<ReservationFormState>>;
  submitting: boolean;
  submitted: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

/** 방문 예약 폼 — 상담신청과 동일한 UI(좌 폼 + 우 요약, 시간 슬롯). /api/keepzip/visits로 저장. */
export default function VisitForm({
  selectedExpert,
  reservationForm,
  setReservationForm,
  submitting,
  submitted,
  error,
  onSubmit,
  onReset,
}: VisitFormProps) {
  const [date, setDate] = useState(() => reservationForm.preferredDate.split("T")[0] || "");
  const [time, setTime] = useState(() => reservationForm.preferredDate.split("T")[1] || "");
  const today = new Date().toISOString().split("T")[0];
  const pickDate = (nd: string) => { setDate(nd); setReservationForm((p) => ({ ...p, preferredDate: nd && time ? `${nd}T${time}` : "" })); };
  const pickTime = (nt: string) => { setTime(nt); setReservationForm((p) => ({ ...p, preferredDate: date && nt ? `${date}T${nt}` : "" })); };

  return (
    <div className={s.block} id="visit-form">
      <p className={s.secEyebrow}>Visit Reservation</p>
      <h2 className={s.secTitle}>방문 예약하기</h2>
      <p className={s.secDesc}>
        사무실 방문 상담 예약입니다. 담당 전문가가 희망 일시를 확인하고 예약을 확정한 뒤 입력하신 연락처로 안내드립니다. (전화 상담은 <b>상담 신청</b>을 이용해 주세요.)
      </p>

      <div className={s.consultLayout}>
        {/* 좌: 방문 예약 폼 */}
        <form className={s.formCard} onSubmit={onSubmit}>
          <div className={s.formCardTitle}>방문 예약서</div>
          <p className={s.formCardSub}>상담 분야와 희망 방문 일시를 입력해 주세요.</p>

          <div className={s.field}>
            <label className={s.fieldLabel}>상담 분야</label>
            <select
              className={s.fSelect}
              value={reservationForm.consultType}
              onChange={(e) => setReservationForm((p) => ({ ...p, consultType: e.target.value }))}
            >
              <option value="">분야 선택 (선택)</option>
              {CONSULT_TYPES.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>희망 방문 일시<span className={s.req}>*</span></label>
            <input className={s.fInput} type="date" required min={today} value={date} onChange={(e) => pickDate(e.target.value)} />
            <div className={s.slotGrid}>
              {TIME_SLOTS.map(([v, l]) => (
                <button key={v} type="button" className={`${s.slotBtn} ${time === v ? s.slotBtnOn : ""}`} onClick={() => pickTime(v)}>{l}</button>
              ))}
            </div>
            <p className={s.slotNote}>방문 가능 시간: 평일 오전 9시 ~ 오후 5시 (오후 12~2시 휴게)</p>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>연락처<span className={s.req}>*</span></label>
            <input
              className={s.fInput}
              type="tel"
              required
              placeholder="010-0000-0000"
              value={reservationForm.phone}
              onChange={(e) => setReservationForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>방문 목적 / 메모</label>
            <textarea
              className={s.fArea}
              placeholder={"상담 목적, 지참 서류 등 전문가에게 미리 전달할 내용을 적어주세요.\n예) 임대차 계약서와 등기부등본을 지참해 방문 상담 예정입니다."}
              value={reservationForm.inquiry}
              onChange={(e) => setReservationForm((p) => ({ ...p, inquiry: e.target.value }))}
            />
          </div>

          <button className={s.submitBtn} type="submit" disabled={submitting}>
            {submitting ? "접수 중..." : "방문 예약 신청"}
          </button>

          {submitted && (
            <div className={`${s.formMsg} ${s.formMsgOk}`}>
              방문 예약이 접수되었습니다. 담당 전문가가 일정 확정 후 연락드립니다.{" "}
              <button
                type="button"
                onClick={onReset}
                style={{ background: "none", border: "none", color: "#0d6b4d", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                새 방문 예약
              </button>
            </div>
          )}
          {error && <div className={`${s.formMsg} ${s.formMsgErr}`}>{error}</div>}
          {!submitted && !error && (
            <p className={s.formNote}>신청 시 개인정보 수집·이용에 동의하는 것으로 간주됩니다. 방문 상담료는 예약 확정 후 안내됩니다.</p>
          )}
        </form>

        {/* 우: 선택 전문가 + 방문 안내 */}
        <div className={s.summaryCard}>
          <div className={s.sumTitle}>선택한 전문가</div>
          <p className={s.sumSub}>목록에서 전문가를 선택하면 여기에 표시됩니다.</p>

          {selectedExpert ? (
            <div className={s.selExpert}>
              <div className={s.selAvatar}>{selectedExpert.name.charAt(0)}</div>
              <div className={s.selInfo}>
                <div className={s.selName}>
                  {selectedExpert.name} {selectedExpert.category} <span className={s.priceBadge}>선택됨</span>
                </div>
              </div>
              <div className={s.selFee}>{fmtHourly(selectedExpert.hourlyFee)}</div>
            </div>
          ) : (
            <div className={s.selEmpty}>선택된 전문가가 없습니다.</div>
          )}

          <div className={`${s.sumTitle} ${s.sumTitleSm}`}>방문 상담 안내</div>
          <p className={s.formNote} style={{ textAlign: "left", marginTop: "8px", lineHeight: 1.7 }}>
            사무실 방문 상담은 전문가가 <b>희망 일시를 확인</b>한 뒤 예약을 확정합니다.
            상담료는 각 전문가가 설정한 <b>시간당 보수료</b> 기준이며, <b>전액 전문가에게 지급</b>됩니다(노쉐어).
          </p>
        </div>
      </div>
    </div>
  );
}
