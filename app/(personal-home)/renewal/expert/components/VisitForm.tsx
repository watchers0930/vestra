"use client";

import s from "../expert.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import type { ReservationFormState } from "@/app/(app)/expert-connect/hooks/useExpertConsult";
import { CONSULT_TYPES } from "@/app/(app)/expert-connect/constants";

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

/** 방문 예약 폼 — 제출 시 /api/keepzip/visits로 저장되어 전문가 대시보드에 전달된다. */
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
  if (submitted) {
    return (
      <div className={s.block} id="visit-form">
        <div className={s.formCard}>
          <div className={s.formCardTitle}>방문 예약이 접수되었습니다</div>
          <p className={s.formCardSub}>
            {selectedExpert?.name ?? "전문가"}님께 예약이 전달되었습니다. 일정 확정 후 입력하신 연락처로 안내드립니다.
          </p>
          <button type="button" className={s.exBtn} style={{ marginTop: "12px" }} onClick={onReset}>
            다른 전문가 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.block} id="visit-form">
      <p className={s.secEyebrow}>Visit Reservation</p>
      <h2 className={s.secTitle}>방문 예약하기</h2>
      <p className={s.secDesc}>
        {selectedExpert?.name
          ? `${selectedExpert.name} 전문가 사무실 방문 상담을 예약합니다. 희망 일시를 남기면 확정 후 연락드립니다.`
          : "사무실 방문 상담을 예약합니다."}
      </p>

      <form className={s.formCard} onSubmit={onSubmit}>
        <div className={s.formCardTitle}>방문 예약서</div>
        <p className={s.formCardSub}>희망 일시와 연락처를 입력해 주세요.</p>

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
          <input
            className={s.fInput}
            type="datetime-local"
            required
            value={reservationForm.preferredDate}
            onChange={(e) => setReservationForm((p) => ({ ...p, preferredDate: e.target.value }))}
          />
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
            className={s.fInput}
            rows={4}
            placeholder="상담 목적, 지참 서류 등 전문가에게 미리 전달할 내용을 적어주세요."
            value={reservationForm.inquiry}
            onChange={(e) => setReservationForm((p) => ({ ...p, inquiry: e.target.value }))}
          />
        </div>

        {error && <p style={{ color: "#d33", fontSize: "13px", marginTop: "8px" }}>{error}</p>}

        <button type="submit" className={s.exBtn} disabled={submitting} style={{ marginTop: "12px" }}>
          {submitting ? "접수 중…" : "방문 예약 신청"}
        </button>
      </form>
    </div>
  );
}
