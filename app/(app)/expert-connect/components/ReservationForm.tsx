"use client";

import { CalendarClock } from "lucide-react";
import { RESERVATION_TYPES } from "../constants";
import type { ReservationFormState } from "../hooks/useExpertConsult";

interface Props {
  reservationForm: ReservationFormState;
  setReservationForm: React.Dispatch<React.SetStateAction<ReservationFormState>>;
  onSubmit: (e: React.FormEvent) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.12)", background: "#fff",
  fontSize: "13.5px", color: "#1d1d1f", outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "13px", fontWeight: 600, color: "#1d1d1f", marginBottom: "6px",
};

export function ReservationForm({ reservationForm, setReservationForm, onSubmit }: Props) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <CalendarClock size={18} strokeWidth={1.5} style={{ color: "#0071e3" }} />
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>상담 예약</h2>
      </div>
      <p style={{ fontSize: "12px", color: "#6e6e73", margin: "0 0 20px" }}>원하시는 상담 유형과 일시를 선택하고 예약하세요</p>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <label style={labelStyle}>상담 유형 <span style={{ color: "#ff3b30" }}>*</span></label>
          <select
            value={reservationForm.consultType}
            onChange={(e) => setReservationForm((p) => ({ ...p, consultType: e.target.value }))}
            style={inputStyle}
          >
            <option value="">상담 유형을 선택하세요</option>
            {RESERVATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>희망 일시 <span style={{ color: "#ff3b30" }}>*</span></label>
          <input
            type="datetime-local"
            value={reservationForm.preferredDate}
            onChange={(e) => setReservationForm((p) => ({ ...p, preferredDate: e.target.value }))}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>문의 내용 <span style={{ color: "#ff3b30" }}>*</span></label>
          <textarea
            value={reservationForm.inquiry}
            onChange={(e) => setReservationForm((p) => ({ ...p, inquiry: e.target.value }))}
            rows={4}
            placeholder="상담받고 싶은 내용을 자세히 적어주세요"
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%", padding: "13px", borderRadius: "13px", border: "none",
            background: "linear-gradient(148deg, #0071e3, #0058b0)", color: "#fff",
            fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: "8px",
            boxShadow: "0 4px 16px rgba(0,113,227,0.30)",
          }}
        >
          <CalendarClock size={15} strokeWidth={2} /> 예약하기
        </button>
      </form>
    </div>
  );
}
