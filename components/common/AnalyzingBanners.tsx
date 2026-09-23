"use client";

import { useState, useEffect } from "react";
import s from "./AnalyzingBanners.module.css";

interface Banner {
  icon: string;
  tag: string;
  title: string;
  desc: string;
  ad?: boolean;
}

/** 분석 대기 중 노출되는 롤링 배너 (베스트라 활용법 + 제휴 광고 영역) */
const BANNERS: Banner[] = [
  { icon: "🔍", tag: "베스트라 활용법", title: "권리분석", desc: "등기부등본으로 근저당·압류·가처분 위험을 한눈에 확인하세요." },
  { icon: "📡", tag: "베스트라 활용법", title: "등기감시", desc: "계약 후 등기 변동을 24시간 감시하고 이상 징후를 즉시 알려드립니다." },
  { icon: "🛡️", tag: "베스트라 활용법", title: "전세보호", desc: "보증금 안전도 진단과 전세보증보험 가입 가능 여부를 확인하세요." },
  { icon: "⚖️", tag: "제휴 광고", title: "변호사·법무사 상담 연결", desc: "이 자리에 전문가 제휴 광고가 노출됩니다. 광고·제휴 문의 환영.", ad: true },
  { icon: "🗺️", tag: "베스트라 활용법", title: "시세지도", desc: "전국 실거래가로 적정 시세와 주변 시세를 비교하세요." },
  { icon: "💰", tag: "베스트라 활용법", title: "시세전망", desc: "AI 투자점수로 부동산의 미래 가치 흐름을 예측합니다." },
  { icon: "🏠", tag: "제휴 광고", title: "부동산 중개 파트너", desc: "이 자리에 공인중개사 제휴 광고가 노출됩니다. 광고·제휴 문의 환영.", ad: true },
];

const ROTATE_MS = 3000;

export default function AnalyzingBanners() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % BANNERS.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const b = BANNERS[idx];

  return (
    <div className={s.wrap}>
      {/* key로 배너 전환 시 페이드 인 재생 */}
      <div key={idx} className={`${s.banner} ${b.ad ? s.adBanner : ""}`}>
        <span className={s.ico} aria-hidden>{b.icon}</span>
        <div className={s.body}>
          <span className={`${s.tag} ${b.ad ? s.adTag : ""}`}>{b.tag}</span>
          <div className={s.title}>{b.title}</div>
          <div className={s.desc}>{b.desc}</div>
        </div>
      </div>
      <div className={s.dots}>
        {BANNERS.map((_, i) => (
          <span key={i} className={`${s.dot} ${i === idx ? s.dotOn : ""}`} />
        ))}
      </div>
    </div>
  );
}
