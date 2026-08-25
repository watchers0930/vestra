"use client";

import { useState } from "react";
import s from "../rights-renewal.module.css";
import type { UnifiedResult } from "@/components/rights/RightsResult";

type Row = {
  part: "갑구" | "을구";
  order: number;
  date: string;
  purpose: string;
  detail: string;
  holder: string;
  amount?: number;
  isCancelled: boolean;
};

/** 등기 목적/말소 여부로 위험 상태 산출 */
function statusOf(purpose: string, isCancelled: boolean): { key: "S" | "W" | "D"; label: string } {
  if (isCancelled) return { key: "S", label: "말소" };
  const p = purpose || "";
  if (/압류|가압류|경매|공매|신탁|가등기|예고등기/.test(p)) return { key: "D", label: "위험" };
  if (/근저당|가처분|지상권|전세권|임차권|질권/.test(p)) return { key: "W", label: "주의" };
  return { key: "S", label: "정상" };
}

function formatAmount(won?: number): string {
  if (!won || won <= 0) return "";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.round((won % 100_000_000) / 10_000);
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok}억`);
  if (man > 0) parts.push(`${man.toLocaleString()}만`);
  return parts.length ? `${parts.join(" ")} 원` : `${won.toLocaleString()}원`;
}

/**
 * 등기부 원문 detail을 보기 좋게 정리.
 * ① 열람용 안내문 꼬리말(이하여백·주의사항·열람일시 등) 이후 제거
 * ② 주요 등기 항목 라벨 앞에서 줄바꿈 → white-space:pre-line으로 렌더
 */
function cleanRegistryDetail(raw: string): string {
  if (!raw) return "";
  let t = raw.replace(/\s+/g, " ").trim();
  // ① 열람용 안내 꼬리말 이후 잘라내기 (요약 항목의 증명서 안내문 제거)
  const cutRe = /(--\s*이\s*하\s*여\s*백\s*--|열\s*람\s*용|열람일시|\*\s*본\s*등기사항|주요\s*등기사항\s*요약|\[\s*주\s*의\s*사\s*항\s*\]|관할등기소|출력일시)/;
  const m = t.match(cutRe);
  if (m && typeof m.index === "number" && m.index > 0) t = t.slice(0, m.index).trim();
  // ② 주요 등기 라벨 앞 줄바꿈
  t = t.replace(/\s+(채권최고액|채무자|근저당권자|설정계약|등기원인|소유자|거래가액|존속기간|이자|변제기|전세금|임차보증금|채권액)\b/g, "\n$1");
  return t.replace(/^\n+/, "").trim();
}

type Filter = "all" | "갑구" | "을구";

export default function RegistryHistoryTab({ result }: { result: UnifiedResult }) {
  const [filter, setFilter] = useState<Filter>("all");

  const gap: Row[] = (result.parsed?.gapgu ?? []).map((e) => ({
    part: "갑구", order: e.order, date: e.date, purpose: e.purpose,
    detail: e.detail, holder: e.holder, isCancelled: e.isCancelled,
  }));
  const eul: Row[] = (result.parsed?.eulgu ?? []).map((e) => ({
    part: "을구", order: e.order, date: e.date, purpose: e.purpose,
    detail: e.detail, holder: e.holder, amount: e.amount, isCancelled: e.isCancelled,
  }));

  const all = [...gap, ...eul].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const rows = filter === "all" ? all : all.filter((r) => r.part === filter);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `전체 ${all.length}건` },
    { id: "갑구", label: `갑구 ${gap.length}건` },
    { id: "을구", label: `을구 ${eul.length}건` },
  ];

  return (
    <div className={`${s.tab} ${s.on}`}>
      <div className={s.panelWrap} style={{ maxWidth: "860px" }}>
        <p className={s.secEyebrow}>Registry History</p>
        <h2 className={s.secTitle}>등기이력 조회</h2>
        <p className={s.secDesc}>소유권 변동·담보권 설정 및 말소 이력을 시계열로 확인합니다.</p>

        {all.length === 0 ? (
          <div className={s.noticeBox}>
            등기부 상세 항목을 불러오지 못했습니다. 주소 기반 <b>간이 분석</b>이거나 등기부 파싱 결과가
            제한적인 경우입니다. 정확한 이력은 등기부등본 파일을 업로드해 분석해 주세요.
          </div>
        ) : (
          <>
            <div className={s.tlFilter}>
              {filters.map((f) => (
                <button
                  key={f.id}
                  className={`${s.tlFtag} ${filter === f.id ? s.on : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className={s.tlWrap}>
              {rows.map((r, i) => {
                const st = statusOf(r.purpose, r.isCancelled);
                const amt = formatAmount(r.amount);
                return (
                  <div className={s.tlItem} key={`${r.part}-${r.order}-${i}`}>
                    <div className={`${s.tlDot} ${st.key === "D" ? s.tlDotD : st.key === "W" ? s.tlDotW : s.tlDotS}`}></div>
                    <div className={s.tlCard}>
                      <div className={s.tlCardHead}>
                        <span className={s.tlDate}>{r.date || "일자 미상"}</span>
                        <span className={`${s.tlPart} ${r.part === "갑구" ? s.tlPartG : s.tlPartE}`}>{r.part}</span>
                        <span className={`${s.tlStatus} ${st.key === "D" ? s.tlSD : st.key === "W" ? s.tlSW : s.tlSS}`}>
                          {r.isCancelled ? "말소" : st.label}
                        </span>
                      </div>
                      <div className={s.tlEvTitle}>
                        {r.purpose}{r.holder ? ` — ${r.holder}` : ""}
                      </div>
                      {(r.detail || amt) && (
                        <div className={s.tlEvDesc} style={{ whiteSpace: "pre-line" }}>
                          {amt && <>채권최고액 {amt}{r.detail ? "\n" : ""}</>}
                          {cleanRegistryDetail(r.detail)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
