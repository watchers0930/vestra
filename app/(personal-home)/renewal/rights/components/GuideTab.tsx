"use client";

import { useState } from "react";
import s from "../rights-renewal.module.css";

const STEPS = [
  { n: "01", t: "등기부 입력", d: "주소 조회 또는 등기부등본 파일(PDF·이미지) 업로드 중 편한 방법으로 입력합니다." },
  { n: "02", t: "AI 텍스트 추출", d: "파일을 올리면 AI가 등기부 내용을 자동으로 읽어 구조화합니다." },
  { n: "03", t: "권리관계 분석", d: "갑구·을구 권리관계를 6개 항목으로 나누어 위험도를 점수화합니다." },
  { n: "04", t: "결과·이력 확인", d: "분석 후 소유자 확인·등기이력 탭이 열려 상세 내용을 확인할 수 있습니다." },
];

const FAQ = [
  { q: "분석 결과는 법적 효력이 있나요?", a: "AI 분석은 참고용이며 법적 효력이 없습니다. 중요한 거래는 반드시 등기부등본 원본과 전문가(공인중개사·법무사) 확인을 받으세요." },
  { q: "주소만 입력해도 분석이 되나요?", a: "네. 주소를 입력하면 틸코 등기부 조회와 공공데이터(실거래가·건축물대장)를 기반으로 간이 분석을 제공합니다. 다만 정확한 권리관계는 등기부등본 파일 업로드 시 더 정밀합니다." },
  { q: "업로드한 파일은 저장되나요?", a: "분석에 필요한 처리 후 결과만 브라우저(로컬)에 보관되며, 파일 원본을 서버에 영구 저장하지 않습니다." },
  { q: "소유자 불일치가 나오면 어떻게 하나요?", a: "임대인·매도인이 실소유자가 아닐 수 있으므로 거래를 중단하고, 등기부상 소유자 본인 여부와 대리 권한을 반드시 확인하세요." },
];

export default function GuideTab() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={`${s.tab} ${s.on}`}>
      <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
        <p className={s.secEyebrow}>User Guide</p>
        <h2 className={s.secTitle}>이용 안내</h2>
        <p className={s.secDesc}>권리분석 서비스 이용 방법과 주의사항을 안내합니다.</p>

        <div className={s.guideSteps}>
          {STEPS.map((st) => (
            <div className={s.gsCard} key={st.n}>
              <div className={s.gsN}>{st.n}</div>
              <div className={s.gsT}>{st.t}</div>
              <div className={s.gsD}>{st.d}</div>
            </div>
          ))}
        </div>

        <div className={s.faqList}>
          {FAQ.map((f, i) => (
            <div className={`${s.faqItem} ${open === i ? s.open : ""}`} key={i}>
              <button className={s.faqQ} onClick={() => setOpen(open === i ? null : i)}>
                {f.q}
                <span className={s.faqQIco}>▼</span>
              </button>
              <div className={s.faqA}>{f.a}</div>
            </div>
          ))}
        </div>

        <div className={s.noticeBox}>
          <b>유의사항</b> — 본 서비스의 분석 결과는 AI가 생성한 참고 자료입니다. 실제 계약·투자 결정 전에는
          반드시 최신 등기부등본 원본을 직접 확인하고, 필요 시 법무사·공인중개사 등 전문가의 검토를 받으시기 바랍니다.
        </div>
      </div>
    </div>
  );
}
