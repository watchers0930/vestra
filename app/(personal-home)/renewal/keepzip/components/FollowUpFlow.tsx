"use client";

import s from "../keepzip-renewal.module.css";

export type FollowUpVariant = "payment_order" | "litigation" | "public_notice";

interface VariantConfig {
  title: string;
  price: string;
  points: string[];
  confirmCta: string;
  isPaid: boolean; // 지급명령만 mock 결제
  doneTitle: string;
  doneDesc: string;
}

const CONFIG: Record<FollowUpVariant, VariantConfig> = {
  payment_order: {
    title: "지급명령 패키지 신청",
    price: "99,000원",
    points: ["지급명령 신청서 자동 생성 포함", "변호사 검토 및 법원 제출 대행", "진행 현황 카카오톡 안내"],
    confirmCta: "99,000원 결제하고 신청하기",
    isPaid: true,
    doneTitle: "지급명령 신청이 완료되었습니다",
    doneDesc: "법원 접수 완료 시 카카오톡으로 사건번호를 안내해 드립니다. 처리 기간은 약 2~4주 소요됩니다.",
  },
  litigation: {
    title: "소송 전담 변호사 상담 신청",
    price: "별도 상담",
    points: ["보증금반환청구 소송 전담 변호사 매칭", "임차권등기명령 병행 검토 가능", "착수금·성공보수는 상담 후 안내"],
    confirmCta: "상담 신청하기",
    isPaid: false,
    doneTitle: "상담 신청이 완료되었습니다",
    doneDesc: "전담 변호사가 24시간 내 카카오톡으로 연락드립니다. 상담은 무료로 진행됩니다.",
  },
  public_notice: {
    title: "공시송달 신청",
    price: "안내",
    points: ["법원 게시판 및 전자소송 홈페이지 게시", "게시 후 2주 경과 시 송달 효력 발생", "이후 지급명령·소송 절차 연계 가능"],
    confirmCta: "공시송달 자동 신청하기",
    isPaid: false,
    doneTitle: "공시송달 신청이 완료되었습니다",
    doneDesc: "법원 게시 후 2주가 경과하면 송달의 효력이 발생합니다. 이후 지급명령·소송 절차를 이어서 진행할 수 있습니다.",
  },
};

interface Props {
  variant: FollowUpVariant;
  done: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onBack?: () => void;
  onReset: () => void;
}

/** 발송 후 후속 절차(지급명령/소송/공시송달) 신청→완료 공통 화면. */
export function FollowUpFlow({ variant, done, busy, onConfirm, onBack, onReset }: Props) {
  const c = CONFIG[variant];

  if (done) {
    return (
      <div className={s.centerCol}>
        <div className={s.panel}>
          <div className={s.resolveMark}>✓</div>
          <div className={s.docTitle}>{c.doneTitle}</div>
          <p className={s.note} style={{ textAlign: "center" }}>{c.doneDesc}</p>
          <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.centerCol}>
      <div className={s.panel}>
        <div className={s.docTitle}>{c.title}</div>
        <ul className={s.checkList}>
          {c.points.map((p) => (
            <li key={p} className={`${s.checkItem} ${s.checkDone}`}><span className={s.checkMark}>✓</span>{p}</li>
          ))}
        </ul>
        {c.isPaid && (
          <div className={s.payTotal}>
            <span>총 결제금액</span>
            <strong>{c.price}</strong>
          </div>
        )}
        <button className={s.submitBtn} style={{ marginTop: 14 }} disabled={busy} onClick={onConfirm}>
          {busy ? "처리 중..." : c.confirmCta}
        </button>
        {c.isPaid && <p className={s.demoInline}>※ 현재 결제는 데모(임의승인)입니다. 실제 결제는 발생하지 않습니다.</p>}
        {onBack && <button className={s.proceedBtn} onClick={onBack}>← 돌아가기</button>}
      </div>
    </div>
  );
}
