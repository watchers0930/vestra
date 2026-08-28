"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { Expert } from "@/components/expert/ExpertCard";
import { CONSULT_TYPES } from "../constants";

export interface ConsultFormState {
  type: string;
  address: string;
  content: string;
  attachAiResult: boolean;
  contactPhone: string;
  contactEmail: string;
  preferredDate: string;
}

export interface ReservationFormState {
  consultType: string;
  preferredDate: string;
  phone: string;
  inquiry: string;
}

export function useExpertConsult() {
  const { data: session } = useSession();
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [formState, setFormState] = useState<ConsultFormState>({
    type: "",
    address: "",
    content: "",
    attachAiResult: false,
    contactPhone: "",
    contactEmail: "",
    preferredDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [reservationForm, setReservationForm] = useState<ReservationFormState>({
    consultType: "",
    preferredDate: "",
    phone: "",
    inquiry: "",
  });
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [visitError, setVisitError] = useState("");

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitError("");

    // 방문예약도 선택한 전문가 대시보드로 전달된다
    if (!selectedExpert) {
      setVisitError("방문할 전문가를 먼저 선택해주세요.");
      return;
    }
    if (!reservationForm.preferredDate.trim()) {
      setVisitError("희망 방문 일시를 입력해주세요.");
      return;
    }
    if (!reservationForm.phone.trim()) {
      setVisitError("연락처를 입력해주세요.");
      return;
    }

    setVisitSubmitting(true);
    try {
      const purpose = [reservationForm.consultType, reservationForm.inquiry.trim()]
        .filter(Boolean).join(" · ");
      const res = await fetch("/api/keepzip/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: selectedExpert.id,
          name: session?.user?.name?.trim() || "방문 신청자",
          phone: reservationForm.phone,
          preferredAt: reservationForm.preferredDate,
          purpose: purpose || "방문 상담",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVisitError(data.error || "예약 신청에 실패했습니다");
        return;
      }
      setVisitSubmitted(true);
    } catch {
      setVisitError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setVisitSubmitting(false);
    }
  };

  const handleConsult = (expert: Expert) => {
    setSelectedExpert(expert);
    setSubmitted(false);
    setError("");
    setVisitSubmitted(false);
    setVisitError("");
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

    // 선택한 전문가가 있어야 상담이 해당 전문가 대시보드로 전달된다
    if (!selectedExpert) {
      setError("상담할 전문가를 먼저 선택해주세요.");
      return;
    }
    if (!formState.contactPhone.trim()) {
      setError("연락처를 입력해주세요.");
      return;
    }
    if (!formState.content.trim()) {
      setError("문의 내용을 입력해주세요.");
      return;
    }
    if (!formState.preferredDate) {
      setError("희망 상담 시간을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      // 관심 물건·이메일은 상담 본문에 함께 담아 전문가가 볼 수 있게 한다
      const extras = [
        formState.address.trim() ? `[관심 물건] ${formState.address.trim()}` : "",
        formState.contactEmail.trim() ? `[이메일] ${formState.contactEmail.trim()}` : "",
      ].filter(Boolean).join("\n");
      const content = extras ? `${extras}\n\n${formState.content}` : formState.content;

      const res = await fetch("/api/keepzip/consults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: selectedExpert.id,
          name: session?.user?.name?.trim() || "상담 신청자",
          phone: formState.contactPhone,
          topic: formState.type || "상담 문의",
          content,
          preferredAt: formState.preferredDate,
        }),
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
    setFormState({ type: "", address: "", content: "", attachAiResult: false, contactPhone: "", contactEmail: "", preferredDate: "" });
    setVisitSubmitted(false);
    setVisitError("");
    setReservationForm({ consultType: "", preferredDate: "", phone: "", inquiry: "" });
  };

  return {
    selectedExpert,
    formState, setFormState,
    submitting, submitted, error,
    reservationForm, setReservationForm,
    visitSubmitting, visitSubmitted, visitError,
    handleReservationSubmit, handleConsult, handleSubmit, resetConsultForm,
  };
}
