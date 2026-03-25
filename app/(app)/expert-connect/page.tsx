"use client";

import { useState } from "react";
import {
  Users,
  Send,
  CheckCircle2,
  Brain,
  UserCheck,
  FileCheck,
  ArrowRight,
  Phone,
  Mail,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ExpertCard, type Expert } from "@/components/expert/ExpertCard";

// ---------------------------------------------------------------------------
// Seed expert data
// ---------------------------------------------------------------------------
const EXPERTS: Expert[] = [
  {
    id: "e1",
    name: "김○○",
    category: "공인중개사",
    specialties: ["전세 안전 검증", "시세 분석", "임대차 분쟁"],
    experience: 12,
    rating: 4.9,
    reviewCount: 247,
    consultFee: 50000,
    available: true,
  },
  {
    id: "e2",
    name: "이○○",
    category: "법무사",
    specialties: ["등기부 해석", "권리분석", "소유권 이전"],
    experience: 15,
    rating: 4.8,
    reviewCount: 189,
    consultFee: 80000,
    available: true,
  },
  {
    id: "e3",
    name: "박○○",
    category: "세무사",
    specialties: ["양도소득세", "취득세", "종합부동산세"],
    experience: 10,
    rating: 4.7,
    reviewCount: 156,
    consultFee: 70000,
    available: true,
  },
  {
    id: "e4",
    name: "최○○",
    category: "변호사",
    specialties: ["계약서 검토", "임대차 분쟁", "부동산 소송"],
    experience: 8,
    rating: 4.9,
    reviewCount: 132,
    consultFee: 100000,
    available: true,
  },
  {
    id: "e5",
    name: "정○○",
    category: "감정평가사",
    specialties: ["시세 감정", "담보 평가", "재개발 감정"],
    experience: 14,
    rating: 4.6,
    reviewCount: 98,
    consultFee: 90000,
    available: false,
  },
  {
    id: "e6",
    name: "한○○",
    category: "공인중개사",
    specialties: ["전세보호", "확정일자", "전입신고 절차"],
    experience: 9,
    rating: 4.8,
    reviewCount: 211,
    consultFee: 40000,
    available: true,
  },
];

const CONSULT_TYPES = [
  "전세 안전 검증",
  "등기부 해석",
  "세금 상담",
  "계약서 검토",
];

const PRICING = [
  { label: "법무사 상담", price: "50,000", icon: "📜" },
  { label: "세무사 상담", price: "80,000", icon: "📊" },
  { label: "공인중개사 상담", price: "30,000", icon: "🏠" },
  { label: "종합 컨설팅", price: "150,000", icon: "💼", highlight: true },
];

const RESERVATION_TYPES = [
  "법무사 상담",
  "세무사 상담",
  "공인중개사 상담",
  "종합 컨설팅",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ExpertConnectPage() {
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [formState, setFormState] = useState({
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

  const [reservationForm, setReservationForm] = useState({
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
    // Auto-select type based on expert specialty
    const matchedType = CONSULT_TYPES.find((t) =>
      expert.specialties.some((s) => s.includes(t.replace(" 검증", "").replace(" 상담", "")))
    );
    if (matchedType) {
      setFormState((p) => ({ ...p, type: matchedType }));
    }
    // Scroll to form
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

  return (
    <div>
      <PageHeader
        icon={Users}
        title="전문가 상담"
        description="AI 분석 결과를 전문가가 직접 검증하고 상담해드립니다"
      />

      {/* ───── Expert List ───── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">
          전문가 목록
        </h2>
        <p className="text-sm text-[#6e6e73] mb-5">
          분야별 검증된 전문가를 선택하고 상담을 요청하세요
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPERTS.map((expert) => (
            <ExpertCard
              key={expert.id}
              expert={expert}
              onConsult={handleConsult}
            />
          ))}
        </div>
      </div>

      {/* ───── Fee / Pricing Section ───── */}
      <div className="mb-10">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                상담 요금 안내
              </h2>
            </div>
            <p className="text-sm text-[#6e6e73] mb-6">
              분야별 전문가 상담 요금을 확인하세요 (VAT 포함)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRICING.map((item) => (
                <div
                  key={item.label}
                  className={`relative rounded-xl border p-5 text-center transition-shadow hover:shadow-md ${
                    item.highlight
                      ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                      : "border-[#e5e5e7] bg-white"
                  }`}
                >
                  {item.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500 text-white">
                      BEST
                    </span>
                  )}
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">
                    {item.label}
                  </h3>
                  <p className={`text-xl font-bold ${item.highlight ? "text-indigo-600" : "text-[#1d1d1f]"}`}>
                    {item.price}
                    <span className="text-xs font-normal text-[#6e6e73] ml-0.5">
                      원/건
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───── Reservation Form ───── */}
      <div className="mb-10">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                상담 예약
              </h2>
            </div>
            <p className="text-sm text-[#6e6e73] mb-6">
              원하시는 상담 유형과 일시를 선택하고 예약하세요
            </p>

            <form onSubmit={handleReservationSubmit} className="space-y-5">
              {/* 상담 유형 */}
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  상담 유형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={reservationForm.consultType}
                  onChange={(e) =>
                    setReservationForm((p) => ({
                      ...p,
                      consultType: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                >
                  <option value="">상담 유형을 선택하세요</option>
                  {RESERVATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* 희망 일시 */}
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  희망 일시 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={reservationForm.preferredDate}
                  onChange={(e) =>
                    setReservationForm((p) => ({
                      ...p,
                      preferredDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>

              {/* 문의 내용 */}
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  문의 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reservationForm.inquiry}
                  onChange={(e) =>
                    setReservationForm((p) => ({
                      ...p,
                      inquiry: e.target.value,
                    }))
                  }
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

      {/* ───── Consultation Form ───── */}
      <div id="consult-form">
        <Card className="mb-10">
          <CardContent>
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">
              상담 요청
            </h2>
            <p className="text-sm text-[#6e6e73] mb-6">
              {selectedExpert
                ? `${selectedExpert.name} ${selectedExpert.category}에게 상담을 요청합니다`
                : "전문가를 선택하거나 아래 양식을 직접 작성해주세요"}
            </p>

            {submitted ? (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-base font-semibold text-[#1d1d1f]">
                  상담 요청이 접수되었습니다
                </h3>
                <p className="mt-2 text-sm text-[#6e6e73] max-w-sm mx-auto">
                  전문가 배정 후 24시간 내 연락드립니다. 빠른 답변을 위해
                  연락처를 확인해주세요.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setSelectedExpert(null);
                    setFormState({
                      type: "",
                      address: "",
                      content: "",
                      attachAiResult: false,
                      contactPhone: "",
                      contactEmail: "",
                    });
                  }}
                  className="mt-6 text-sm text-[#424245] underline underline-offset-4 hover:text-[#1d1d1f]"
                >
                  새 상담 요청
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    상담 유형 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CONSULT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormState((p) => ({ ...p, type }))
                        }
                        className={`px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                          formState.type === type
                            ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                            : "bg-white text-[#424245] border-[#e5e5e7] hover:border-[#1d1d1f]/30"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    물건 주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="예: 서울특별시 강남구 테헤란로 123, 101동 1001호"
                    className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    문의 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formState.content}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, content: e.target.value }))
                    }
                    rows={4}
                    placeholder="궁금하신 점이나 검토가 필요한 사항을 자세히 적어주세요"
                    className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30 resize-none"
                  />
                </div>

                {/* AI Result Attach */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.attachAiResult}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        attachAiResult: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[#e5e5e7] text-[#1d1d1f] focus:ring-[#1d1d1f]/10"
                  />
                  <span className="text-sm text-[#424245]">
                    AI 분석 결과를 전문가에게 함께 전달
                  </span>
                </label>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                      <Phone size={13} className="inline mr-1" />
                      연락처 (전화번호)
                    </label>
                    <input
                      type="tel"
                      value={formState.contactPhone}
                      onChange={(e) =>
                        setFormState((p) => ({
                          ...p,
                          contactPhone: e.target.value,
                        }))
                      }
                      placeholder="010-0000-0000"
                      className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                      <Mail size={13} className="inline mr-1" />
                      연락처 (이메일)
                    </label>
                    <input
                      type="email"
                      value={formState.contactEmail}
                      onChange={(e) =>
                        setFormState((p) => ({
                          ...p,
                          contactEmail: e.target.value,
                        }))
                      }
                      placeholder="example@email.com"
                      className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-xl">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  icon={Send}
                  loading={submitting}
                  size="lg"
                  fullWidth
                >
                  상담 요청하기
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ───── Process Infographic ───── */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">
            AI + 전문가 하이브리드 검증 프로세스
          </h2>
          <p className="text-sm text-[#6e6e73] mb-8">
            AI가 빠르게 1차 분석하고, 전문가가 정밀 검증하는 2단계 프로세스
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0">
            {/* Step 1 */}
            <div className="flex-1 text-center p-6 rounded-xl bg-[#f5f5f7]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Brain className="h-7 w-7 text-blue-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                1단계: AI 즉시 분석
              </h3>
              <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
                문서 업로드 즉시 AI가
                <br />
                권리관계·위험요소를 분석
              </p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[10px] font-medium text-blue-600">
                평균 3.2초 소요
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 p-2">
              <ArrowRight className="h-5 w-5 text-[#86868b] rotate-90 md:rotate-0" />
            </div>

            {/* Step 2 */}
            <div className="flex-1 text-center p-6 rounded-xl bg-[#f5f5f7]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <UserCheck
                  className="h-7 w-7 text-emerald-500"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                2단계: 전문가 정밀 검증
              </h3>
              <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
                공인중개사·법무사가
                <br />
                AI 분석 결과를 교차 검증
              </p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-medium text-emerald-600">
                24시간 내 완료
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 p-2">
              <ArrowRight className="h-5 w-5 text-[#86868b] rotate-90 md:rotate-0" />
            </div>

            {/* Step 3 */}
            <div className="flex-1 text-center p-6 rounded-xl bg-[#f5f5f7]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <FileCheck
                  className="h-7 w-7 text-purple-500"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                최종: 검증 완료 보고서
              </h3>
              <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
                AI 분석 + 전문가 의견이
                <br />
                통합된 최종 보고서 제공
              </p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-[10px] font-medium text-purple-600">
                신뢰도 99%+
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
