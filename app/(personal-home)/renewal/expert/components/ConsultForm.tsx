"use client";

import s from "../expert.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import type { ConsultFormState } from "@/app/(app)/expert-connect/hooks/useExpertConsult";
// 상담 분야 옵션 — 제출 시 /api/keepzip/consults의 topic으로 전달된다
import { CONSULT_TYPES } from "@/app/(app)/expert-connect/constants";

function formatFeeShort(fee: number) {
  if (fee >= 10000) return `${(fee / 10000).toLocaleString()}만원`;
  return `${fee.toLocaleString()}원`;
}

interface ConsultFormProps {
  selectedExpert: Expert | null;
  formState: ConsultFormState;
  setFormState: React.Dispatch<React.SetStateAction<ConsultFormState>>;
  submitting: boolean;
  submitted: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

/** 상담 신청 폼 (좌) + 선택 전문가·상담료 요약 (우). useExpertConsult 연결. */
export default function ConsultForm({
  selectedExpert,
  formState,
  setFormState,
  submitting,
  submitted,
  error,
  onSubmit,
  onReset,
}: ConsultFormProps) {
  return (
    <div className={s.block} id="consult-form">
      <p className={s.secEyebrow}>Consult Request</p>
      <h2 className={s.secTitle}>상담 신청하기</h2>
      <p className={s.secDesc}>
        아래 폼을 작성하면 담당 전문가가 24시간 이내에 연락드립니다. AI 분석 결과를 첨부하면 더 정확한 상담을 받을 수 있습니다.
      </p>

      <div className={s.consultLayout}>
        {/* 좌: 상담 신청 폼 */}
        <form className={s.formCard} onSubmit={onSubmit}>
          <div className={s.formCardTitle}>상담 신청서</div>
          <p className={s.formCardSub}>상담 분야와 관심 물건 정보를 입력해 주세요.</p>

          <div className={s.field}>
            <label className={s.fieldLabel}>상담 분야<span className={s.req}>*</span></label>
            <select
              className={s.fSelect}
              required
              value={formState.type}
              onChange={(e) => setFormState((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="" disabled>상담 분야를 선택하세요</option>
              {CONSULT_TYPES.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>관심 물건 / 주소</label>
            <input
              className={s.fInput}
              type="text"
              placeholder="예) 서울시 마포구 합정동 402-5 3층"
              value={formState.address}
              onChange={(e) => setFormState((p) => ({ ...p, address: e.target.value }))}
            />
          </div>

          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.fieldLabel}>연락처<span className={s.req}>*</span></label>
              <input
                className={s.fInput}
                type="text"
                placeholder="010-0000-0000"
                required
                value={formState.contactPhone}
                onChange={(e) => setFormState((p) => ({ ...p, contactPhone: e.target.value }))}
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>이메일</label>
              <input
                className={s.fInput}
                type="text"
                placeholder="you@example.com"
                value={formState.contactEmail}
                onChange={(e) => setFormState((p) => ({ ...p, contactEmail: e.target.value }))}
              />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>상담 내용<span className={s.req}>*</span></label>
            <textarea
              className={s.fArea}
              required
              placeholder={"상담받고 싶은 내용을 자세히 적어주세요.\n예) 전세 계약 전 등기부등본상 근저당이 있어 안전성이 걱정됩니다. 계약을 진행해도 될지 검토 부탁드립니다."}
              value={formState.content}
              onChange={(e) => setFormState((p) => ({ ...p, content: e.target.value }))}
            />
          </div>

          <label className={s.fCheck}>
            <input
              type="checkbox"
              checked={formState.attachAiResult}
              onChange={(e) => setFormState((p) => ({ ...p, attachAiResult: e.target.checked }))}
            />
            <span className={s.fCheckTxt}>
              <b>VESTRA AI 분석 결과 첨부</b> — 최근 전세안전분석 리포트를 전문가에게 함께 전달합니다.
            </span>
          </label>

          <button className={s.submitBtn} type="submit" disabled={submitting}>
            {submitting ? "신청 중..." : "상담 신청하기"}
          </button>

          {submitted && (
            <div className={`${s.formMsg} ${s.formMsgOk}`}>
              상담 신청이 접수되었습니다. 담당 전문가가 24시간 이내에 연락드립니다.{" "}
              <button
                type="button"
                onClick={onReset}
                style={{ background: "none", border: "none", color: "#0d6b4d", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                새 상담 신청
              </button>
            </div>
          )}
          {error && <div className={`${s.formMsg} ${s.formMsgErr}`}>{error}</div>}
          {!submitted && !error && (
            <p className={s.formNote}>신청 시 개인정보 수집·이용에 동의하는 것으로 간주됩니다. 상담료는 매칭 확정 후 결제됩니다.</p>
          )}
        </form>

        {/* 우: 선택 전문가 + 상담료 안내 */}
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
              <div className={s.selFee}>{formatFeeShort(selectedExpert.consultFee)}</div>
            </div>
          ) : (
            <div className={s.selEmpty}>선택된 전문가가 없습니다.</div>
          )}

          <div className={`${s.sumTitle} ${s.sumTitleSm}`}>상담료 안내</div>
          <div className={s.priceList}>
            <div className={s.priceRow}>
              <span className={s.priceL}>
                <span className={s.priceIco}><svg viewBox="0 0 24 24"><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7l-2.5 6a3 3 0 0 0 5 0z" /><path d="M19 7l-2.5 6a3 3 0 0 0 5 0z" /></svg></span>
                법무사 상담
              </span>
              <span className={s.priceV}>50,000<small>원</small></span>
            </div>
            <div className={s.priceRow}>
              <span className={s.priceL}>
                <span className={s.priceIco}><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></span>
                세무사 상담
              </span>
              <span className={s.priceV}>80,000<small>원</small></span>
            </div>
            <div className={s.priceRow}>
              <span className={s.priceL}>
                <span className={s.priceIco}><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg></span>
                공인중개사 상담
              </span>
              <span className={s.priceV}>30,000<small>원</small></span>
            </div>
            <div className={`${s.priceRow} ${s.hl}`}>
              <span className={s.priceL}>
                <span className={s.priceIco}><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></span>
                종합 컨설팅<span className={s.priceBadge}>추천</span>
              </span>
              <span className={s.priceV}>150,000<small>원</small></span>
            </div>
          </div>
          <p className={s.formNote} style={{ textAlign: "left", marginTop: "14px" }}>
            ※ 상담료는 시안 예시이며 전문가·상담 유형에 따라 달라질 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
