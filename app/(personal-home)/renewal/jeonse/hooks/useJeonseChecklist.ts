"use client";

/**
 * useJeonseChecklist — 전세 계약 체크리스트 상태 훅 (설계 §4.5 ④)
 *
 * DB 미적용 계약: 회원 기기 간 서버 저장은 아직 비활성이다(백엔드 API는 준비 중 500 응답).
 * 따라서 현재는 이 브라우저(localStorage) 임시 저장만 활성이며, "기기 간 저장 사용 가능"처럼
 * 안내하지 않는다. 항목 정의는 서버/클라 공용 단일 소스(lib/jeonse/checklist-items)를 사용한다.
 *
 * 허용 ID(0~CHECKLIST_TOTAL-1)·boolean만 저장/복원하며, 손상·범위 밖 값은 무시한다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { CHECKLIST_TOTAL } from "@/lib/jeonse/checklist-items";

type ChecklistState = Record<number, boolean>;

/**
 * 계정별 네임스페이스 키. 단일 전역 키를 쓰면 같은 브라우저에서 A 계정 완료 항목이
 * B 계정·비로그인에도 그대로 보인다(설계 §4.5, 계정 격리). 세션 사용자별로 키를 분리하고
 * 세션 전환 시 해당 사용자 저장분만 복원한다. 레거시 전역 키는 자동 적용하지 않는다.
 */
function storageKeyFor(userId: string | null): string {
  return `vestra_jeonse_checklist_v1::${userId ?? "anon"}`;
}

/** 허용 ID·boolean만 남긴 안전한 상태로 정규화 */
function sanitize(raw: unknown): ChecklistState {
  const out: ChecklistState = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    if (Number.isInteger(id) && id >= 0 && id < CHECKLIST_TOTAL && typeof v === "boolean" && v) {
      out[id] = true;
    }
  }
  return out;
}

export function useJeonseChecklist() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const storageKey = storageKeyFor(userId);

  const [state, setState] = useState<ChecklistState>({});
  const [lastSaved, setLastSaved] = useState<string>("");

  // 현재 활성 저장 키 — toggle이 최신 키로 쓰도록 ref로 추적
  const keyRef = useRef(storageKey);
  // 세션 확정 전에는 저장을 막는다(익명키에 썼다가 로그인 복원으로 유실되는 것 방지).
  const readyRef = useRef(false);

  // 복원/초기화 — 세션(계정) 확정 후 해당 사용자 저장분만 복원.
  // 세션 전환 시 키가 바뀌며 이전 계정 완료 항목을 승계하지 않는다.
  useEffect(() => {
    if (status === "loading") { readyRef.current = false; return; } // 세션 미확정 시 저장 차단(재로딩 포함)
    readyRef.current = true;
    keyRef.current = storageKey;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(sanitize(parsed?.state));
      setLastSaved(typeof parsed?.updatedAt === "string" ? parsed.updatedAt : "");
    } catch {
      setState({});
      setLastSaved("");
    }
  }, [storageKey, status]);

  const toggle = useCallback((id: number) => {
    if (!readyRef.current) return; // 세션 확정 전에는 저장하지 않는다(익명키 오염·유실 방지)
    if (!Number.isInteger(id) || id < 0 || id >= CHECKLIST_TOTAL) return;
    setState((prev) => {
      const next: ChecklistState = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      try {
        const updatedAt = new Date().toISOString();
        localStorage.setItem(keyRef.current, JSON.stringify({ state: next, updatedAt }));
        setLastSaved(updatedAt);
      } catch { /* 저장 실패해도 UI는 정상 동작 */ }
      return next;
    });
  }, []);

  const checkedCount = Object.values(state).filter(Boolean).length;

  return {
    state,
    toggle,
    checkedCount,
    total: CHECKLIST_TOTAL,
    lastSaved,
    /** 세션 확정 전이면 false — UI는 토글을 비활성화해 유실을 방지한다 */
    ready: status !== "loading",
    /** 회원 기기 간 서버 저장 활성 여부. DB 미적용으로 현재 비활성 */
    serverSaveEnabled: false as const,
  };
}
