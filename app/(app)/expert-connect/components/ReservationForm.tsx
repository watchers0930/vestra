"use client";

import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/common/Card";
import { RESERVATION_TYPES } from "../constants";
import type { ReservationFormState } from "../hooks/useExpertConsult";

interface Props {
  reservationForm: ReservationFormState;
  setReservationForm: React.Dispatch<React.SetStateAction<ReservationFormState>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function ReservationForm({ reservationForm, setReservationForm, onSubmit }: Props) {
  return (
    <div className="mb-10">
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-[#1d1d1f]">상담 예약</h2>
          </div>
          <p className="text-sm text-[#6e6e73] mb-6">원하시는 상담 유형과 일시를 선택하고 예약하세요</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                상담 유형 <span className="text-red-500">*</span>
              </label>
              <select
                value={reservationForm.consultType}
                onChange={(e) => setReservationForm((p) => ({ ...p, consultType: e.target.value }))}
                className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                <option value="">상담 유형을 선택하세요</option>
                {RESERVATION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                희망 일시 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={reservationForm.preferredDate}
                onChange={(e) => setReservationForm((p) => ({ ...p, preferredDate: e.target.value }))}
                className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                문의 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reservationForm.inquiry}
                onChange={(e) => setReservationForm((p) => ({ ...p, inquiry: e.target.value }))}
                rows={4}
                placeholder="상담받고 싶은 내용을 자세히 적어주세요"
                className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 active:bg-indigo-700"
            >
              <CalendarClock className="h-4 w-4" />
              예약하기
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
