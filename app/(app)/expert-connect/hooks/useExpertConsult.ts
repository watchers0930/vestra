"use client";

import { useState } from "react";
import type { Expert } from "@/components/expert/ExpertCard";
import { CONSULT_TYPES } from "../constants";

export interface ConsultFormState {
  type: string;
  address: string;
  content: string;
  attachAiResult: boolean;
  contactPhone: string;
  contactEmail: string;
}

export interface ReservationFormState {
  consultType: string;
  preferredDate: string;
  inquiry: string;
}

export function useExpertConsult() {
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [formState, setFormState] = useState<ConsultFormState>({
    type: "",
    address: "",
    content: "",
    attachAiResult: false,
    contactPhone: "",
    contactEmail: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [reservationForm, setReservationForm] = useState<ReservationFormState>({
    consultType: "",
    preferredDate: "",
    inquiry: "",
  });

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationForm.consultType || !reservationForm.preferredDate || !reservationForm.inquiry) {
      alert("모든 항목을 입력해주세요.");
      return;
    }
    alert(
      `상담 예약이 완료되었습니다.\n\n상담 유형: ${reservationForm.consultType}\n희망 일시: ${reservationForm.preferredDate}\n문의 내용: ${reservationForm.inquiry}`
    );
    setReservationForm({ consultType: "", preferredDate: "", inquiry: "" });
  };

  const handleConsult = (expert: Expert) => {
    setSelectedExpert(expert);
    setSubmitted(false);
    setError("");
    const matchedType = CONSULT_TYPES.find((t) =>
      expert.specialties.some((s) => s.includes(t.replace(" 검증", "").replace(" 상담", "")))
    );
    if (matchedType) {
      setFormState((p) => ({ ...p, type: matchedType }));
    }
    setTimeout(() => {
      document.getElementById("consult-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/expert/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "요청 처리에 실패했습니다");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetConsultForm = () => {
    setSubmitted(false);
    setSelectedExpert(null);
    setFormState({ type: "", address: "", content: "", attachAiResult: false, contactPhone: "", contactEmail: "" });
  };

  return {
    selectedExpert,
    formState, setFormState,
    submitting, submitted, error,
    reservationForm, setReservationForm,
    handleReservationSubmit, handleConsult, handleSubmit, resetConsultForm,
  };
}
