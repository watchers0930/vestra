"use client";

import { Send, CheckCircle2, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { CONSULT_TYPES } from "../constants";
import type { Expert } from "@/components/expert/ExpertCard";
import type { ConsultFormState } from "../hooks/useExpertConsult";

interface Props {
  selectedExpert: Expert | null;
  formState: ConsultFormState;
  setFormState: React.Dispatch<React.SetStateAction<ConsultFormState>>;
  submitting: boolean;
  submitted: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export function ConsultForm({
  selectedExpert, formState, setFormState,
  submitting, submitted, error,
  onSubmit, onReset,
}: Props) {
  return (
    <div id="consult-form">
      <Card className="mb-10">
        <CardContent>
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">상담 요청</h2>
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
              <h3 className="text-base font-semibold text-[#1d1d1f]">상담 요청이 접수되었습니다</h3>
              <p className="mt-2 text-sm text-[#6e6e73] max-w-sm mx-auto">
                전문가 배정 후 24시간 내 연락드립니다. 빠른 답변을 위해 연락처를 확인해주세요.
              </p>
              <button
                onClick={onReset}
                className="mt-6 text-sm text-[#424245] underline underline-offset-4 hover:text-[#1d1d1f]"
              >
                새 상담 요청
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {/* 상담 유형 */}
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  상담 유형 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CONSULT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormState((p) => ({ ...p, type }))}
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

              {/* 물건 주소 */}
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  물건 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState((p) => ({ ...p, address: e.target.value }))}
                  placeholder="예: 서울특별시 강남구 테헤란로 123, 101동 1001호"
                  className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30"
                />
              </div>

              {/* 문의 내용 */}
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                  문의 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formState.content}
                  onChange={(e) => setFormState((p) => ({ ...p, content: e.target.value }))}
                  rows={4}
                  placeholder="궁금하신 점이나 검토가 필요한 사항을 자세히 적어주세요"
                  className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30 resize-none"
                />
              </div>

              {/* AI 결과 첨부 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.attachAiResult}
                  onChange={(e) => setFormState((p) => ({ ...p, attachAiResult: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#e5e5e7] text-[#1d1d1f] focus:ring-[#1d1d1f]/10"
                />
                <span className="text-sm text-[#424245]">AI 분석 결과를 전문가에게 함께 전달</span>
              </label>

              {/* 연락처 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    <Phone size={13} className="inline mr-1" />연락처 (전화번호)
                  </label>
                  <input
                    type="tel"
                    value={formState.contactPhone}
                    onChange={(e) => setFormState((p) => ({ ...p, contactPhone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    <Mail size={13} className="inline mr-1" />연락처 (이메일)
                  </label>
                  <input
                    type="email"
                    value={formState.contactEmail}
                    onChange={(e) => setFormState((p) => ({ ...p, contactEmail: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/10 focus:border-[#1d1d1f]/30"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
              )}

              <Button type="submit" icon={Send} loading={submitting} size="lg" fullWidth>
                상담 요청하기
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
