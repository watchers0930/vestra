"use client";

import s from "../expert.module.css";

interface Props {
  onSelect: (categories: string[], label: string) => void;
}

/** STEP 1 — 전문가 영역(분야) 선택. 클릭 시 해당 분야의 전문가 목록으로. */
export default function ExpertFields({ onSelect }: Props) {
  return (
    <div className={s.block}>
      <p className={s.secEyebrow}>Expert Fields</p>
      <h2 className={s.secTitle}>어떤 분야가 필요하세요?</h2>
      <p className={s.secDesc}>
        분야를 선택하면 해당 분야의 검증된 전문가만 보여드립니다.<br />
        법무·세무·중개·감정 4개 분야의 전문가가 함께합니다.
      </p>
      <div className={s.fieldGrid}>
        <div className={s.fieldCard} role="button" tabIndex={0} style={{ cursor: "pointer" }}
          onClick={() => onSelect(["법무사", "변호사"], "법무사 · 변호사")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(["법무사", "변호사"], "법무사 · 변호사"); }}>
          <div className={s.fieldIco}>
            <svg viewBox="0 0 24 24"><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7l-2.5 6a3 3 0 0 0 5 0z" /><path d="M19 7l-2.5 6a3 3 0 0 0 5 0z" /><path d="M8 21h8" /></svg>
          </div>
          <div className={s.fieldName}>법무사 · 변호사</div>
          <div className={s.fieldDesc}>등기부 해석, 권리분석, 계약서 검토와 임대차 분쟁 대응을 지원합니다.</div>
          <div className={s.fieldTags}>
            <span className={s.ftag}>등기부 해석</span>
            <span className={s.ftag}>권리분석</span>
            <span className={s.ftag}>계약서 검토</span>
          </div>
        </div>
        <div className={s.fieldCard} role="button" tabIndex={0} style={{ cursor: "pointer" }}
          onClick={() => onSelect(["세무사"], "세무사")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(["세무사"], "세무사"); }}>
          <div className={s.fieldIco}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </div>
          <div className={s.fieldName}>세무사</div>
          <div className={s.fieldDesc}>양도소득세·취득세·종합부동산세 절세 전략과 신고 실무를 상담합니다.</div>
          <div className={s.fieldTags}>
            <span className={s.ftag}>양도소득세</span>
            <span className={s.ftag}>취득세</span>
            <span className={s.ftag}>종부세</span>
          </div>
        </div>
        <div className={s.fieldCard} role="button" tabIndex={0} style={{ cursor: "pointer" }}
          onClick={() => onSelect(["공인중개사"], "공인중개사")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(["공인중개사"], "공인중개사"); }}>
          <div className={s.fieldIco}>
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div className={s.fieldName}>공인중개사</div>
          <div className={s.fieldDesc}>전세 안전 검증, 시세 분석, 확정일자·전입신고 등 실무 절차를 안내합니다.</div>
          <div className={s.fieldTags}>
            <span className={s.ftag}>전세 안전 검증</span>
            <span className={s.ftag}>시세 분석</span>
            <span className={s.ftag}>확정일자</span>
          </div>
        </div>
        <div className={s.fieldCard} role="button" tabIndex={0} style={{ cursor: "pointer" }}
          onClick={() => onSelect(["감정평가사"], "감정평가사")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(["감정평가사"], "감정평가사"); }}>
          <div className={s.fieldIco}>
            <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          </div>
          <div className={s.fieldName}>감정평가사</div>
          <div className={s.fieldDesc}>시세 감정, 담보 평가, 재개발·재건축 감정 등 자산 가치 평가를 지원합니다.</div>
          <div className={s.fieldTags}>
            <span className={s.ftag}>시세 감정</span>
            <span className={s.ftag}>담보 평가</span>
            <span className={s.ftag}>재개발 감정</span>
          </div>
        </div>
      </div>
    </div>
  );
}
