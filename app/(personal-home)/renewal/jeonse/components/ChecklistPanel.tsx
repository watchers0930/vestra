"use client";

/**
 * ChecklistPanel — 전세 계약 체크리스트 UI (설계 §4.5 ④)
 *
 * 항목 정의는 서버/클라 공용 단일 소스(lib/jeonse/checklist-items)를 사용하고,
 * 완료 개수·총개수도 정의 기준으로 계산한다(임의 JSON 키 집계 금지).
 * 상태·저장은 useJeonseChecklist 훅이 담당(단일 책임 분리).
 *
 * DB 미적용으로 회원 기기 간 서버 저장은 비활성 — "사용 가능"처럼 안내하지 않는다.
 */
import { CHECKLIST_ITEMS } from "@/lib/jeonse/checklist-items";
import { useJeonseChecklist } from "../hooks/useJeonseChecklist";
import s from "../jeonse-renewal.module.css";

/** 항목별 보조 설명 (표시 전용) */
const CK_SUBS: Record<number, string> = {
  0: "근저당·압류·가압류 이상 없음 확인",
  1: "매매가 대비 전세 보증금 비율 확인",
  2: "등기부상 소유자 = 임대인 일치 여부",
  3: "국가공간정보포털에서 자격증 진위 확인",
  4: "불법 증개축·용도변경 이력 없음",
  5: '"선순위 근저당 ○○원 초과 시 계약 해지" 등',
  6: "제3자 계좌로 이체 요청 시 즉시 거절",
  7: "중개사 기명날인 포함 여부 확인",
  8: "새 근저당·압류 설정 여부 재확인",
  9: "입주 당일 또는 다음날 처리",
  10: "주민센터 또는 인터넷등기소",
  11: "보증금 6천만원 초과 또는 월세 30만원 초과",
  12: "HUG 또는 SGI — 전입신고 후 1개월 이내",
  13: "만기 시 필요하므로 안전한 곳에 보관",
  14: "VESTRA 등기감시로 이상 발생 시 즉시 알림",
};

/** CHECKLIST_ITEMS를 group별로 묶는다(정의 등장 순서 보존) */
function groupItems() {
  const groups: Array<{ group: string; items: typeof CHECKLIST_ITEMS }> = [];
  for (const item of CHECKLIST_ITEMS) {
    let g = groups.find((x) => x.group === item.group);
    if (!g) { g = { group: item.group, items: [] }; groups.push(g); }
    g.items.push(item);
  }
  return groups;
}

export function ChecklistPanel() {
  const { state, toggle, checkedCount, total, lastSaved, ready } = useJeonseChecklist();
  const barWidth = `${total > 0 ? (checkedCount / total) * 100 : 0}%`;
  const groups = groupItems();

  return (
    <div className={s.panelWrap}>
      <p className={s.secEyebrow}>Contract Checklist</p>
      <h2 className={s.secTitle}>계약체크리스트</h2>
      <p className={s.secDesc}>
        전세 계약 전·중·후 반드시 확인해야 할 항목들입니다.<br />
        체크가 완료되지 않은 항목이 있으면 계약을 진행하지 마세요.
      </p>

      <div className={s.ckProgress}>
        <span style={{ fontSize: "13px", color: "#666", whiteSpace: "nowrap" }}>완료율</span>
        <div className={s.ckBarWrap}><div className={s.ckBar} style={{ width: barWidth }} /></div>
        <span className={s.ckProgTxt}>{checkedCount} / {total}</span>
      </div>

      <p style={{ fontSize: "12px", color: "#8a90a6", marginTop: "8px" }}>
        체크 상태는 이 브라우저에 저장되어 새로고침하거나 다시 방문해도 이어집니다.
        {lastSaved && ` · 마지막 저장: ${new Date(lastSaved).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}`}
      </p>
      <p style={{ fontSize: "12px", color: "#8a90a6", marginTop: "4px" }}>
        회원 기기 간 서버 저장(휴대폰·PC 동기화)은 준비 중입니다. 현재는 이 브라우저에만 저장됩니다.
      </p>

      <div className={s.ckGroupsGrid}>
        {groups.map((g) => (
          <div key={g.group} className={s.ckGroup}>
            <div className={s.ckGroupTitle}>{g.group}</div>
            {g.items.map((item) => (
              <div key={item.id} className={s.ckItem}>
                <input
                  type="checkbox"
                  className={s.ckCb}
                  checked={!!state[item.id]}
                  onChange={() => toggle(item.id)}
                  disabled={!ready}
                  aria-label={item.label}
                />
                <label
                  className={`${s.ckLabel}${state[item.id] ? " " + s.checked : ""}`}
                  onClick={() => { if (ready) toggle(item.id); }}
                >
                  {item.label}
                  {CK_SUBS[item.id] && <div className={s.ckSub}>{CK_SUBS[item.id]}</div>}
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
