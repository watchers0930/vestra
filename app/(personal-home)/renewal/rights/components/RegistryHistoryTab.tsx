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

function fmtWonText(raw: string): string {
  const n = Number(raw.replace(/[^0-9]/g, ""));
  return formatAmount(n) || `${raw}원`;
}

/** holder 값이 실제 권리자명인지(파싱 오류 방어) */
function validHolder(holder: string): boolean {
  const h = (holder || "").trim();
  if (!h || h.length > 30) return false;
  return !/(요약|이하여백|열람|주의사항|등기사항|출력일시|관할등기소)/.test(h);
}

/**
 * 등기 항목의 detail 원문 + 구조화 필드에서 "라벨:값" 핵심 정보만 추출.
 * 안내문 등 매칭되지 않는 원문은 자동 배제되어 읽기 쉬워진다.
 */
function extractRegistryFields(r: Row): { label: string; value: string }[] {
  const d = (r.detail || "").replace(/\s+/g, " ");
  const out: { label: string; value: string }[] = [];
  const cause = d.match(/(설정계약|매매|해지|증여|상속|재산분할|신탁재산의 귀속|신탁|임의경매|강제경매|공매|확정채권양도|계약양도|계약인수|변경계약|말소|전세권설정)/)?.[1];
  if (cause) out.push({ label: "등기원인", value: cause });
  const receipt = d.match(/제\s?\d{1,7}\s?호/)?.[0]?.replace(/\s/g, "");
  if (receipt) out.push({ label: "접수번호", value: receipt });
  if (r.amount && r.amount > 0) out.push({ label: "채권최고액", value: formatAmount(r.amount) });
  const debtor = d.match(/채무자\s*([가-힣]{2,4})/)?.[1];
  if (debtor) out.push({ label: "채무자", value: debtor });
  const deal = d.match(/거래가액\s*금?\s*([\d,]+)\s*원/)?.[1];
  if (deal) out.push({ label: "거래가액", value: fmtWonText(deal) });
  return out;
}

/** 원문 접기용 — 열람 안내 꼬리말 제거 + 공백 정리 */
function cleanRegistryDetail(raw: string): string {
  if (!raw) return "";
  let t = raw.replace(/\s+/g, " ").trim();
  const cutRe = /(--\s*이\s*하\s*여\s*백\s*--|열\s*람\s*용|열람일시|\*\s*본\s*등기사항|주요\s*등기사항\s*요약|\[\s*주\s*의\s*사\s*항\s*\]|관할등기소|출력일시)/;
  const m = t.match(cutRe);
  if (m && typeof m.index === "number" && m.index > 0) t = t.slice(0, m.index).trim();
  return t;
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
                const holderOk = validHolder(r.holder);
                const roleLabel = /소유/.test(r.purpose) ? "소유자" : /근저당/.test(r.purpose) ? "근저당권자" : /전세권/.test(r.purpose) ? "전세권자" : /임차/.test(r.purpose) ? "임차권자" : "권리자";
                const fields = extractRegistryFields(r);
                const rawClean = cleanRegistryDetail(r.detail);
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
                        {r.purpose}{holderOk ? ` — ${r.holder}` : ""}
                      </div>
                      {/* 핵심 정보 라벨:값 (안내문 등 원문 잡음은 자동 배제) */}
                      {(fields.length > 0 || holderOk) && (
                        <div className={s.tlEvDesc} style={{ display: "grid", gap: "3px" }}>
                          {holderOk && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <span style={{ color: "#9096a8", minWidth: "62px", flexShrink: 0 }}>{roleLabel}</span>
                              <span style={{ color: "#3a3f52" }}>{r.holder}</span>
                            </div>
                          )}
                          {fields.map((f) => (
                            <div key={f.label} style={{ display: "flex", gap: "8px" }}>
                              <span style={{ color: "#9096a8", minWidth: "62px", flexShrink: 0 }}>{f.label}</span>
                              <span style={{ color: "#3a3f52" }}>{f.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 등기부 원문 (필요 시 펼쳐 확인) */}
                      {rawClean && (
                        <details style={{ marginTop: "8px" }}>
                          <summary style={{ cursor: "pointer", color: "#9096a8", fontSize: "11.5px" }}>등기부 원문 보기</summary>
                          <div style={{ marginTop: "5px", fontSize: "11.5px", color: "#aab", lineHeight: 1.6, wordBreak: "break-all" }}>{rawClean}</div>
                        </details>
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
