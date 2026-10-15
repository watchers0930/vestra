/**
 * 비회원 등기감시 — 외부 결제/본인인증 창(다날) 실행 헬퍼 + 리다이렉트 복귀 상태.
 *
 * 설계서 §3.2/§3.3: 서버가 `launch`(인증창) / `payment`(결제창) 실행 정보를
 * `Record<string, string>`로 내려준다. 실제 다날 프로토콜(필드명·서명·반환 URL)은
 * 키 수령 후 확정되므로(설계 §8 미확정), 프론트는 필드명을 가정하지 않고 방어적으로 실행한다.
 *
 * 지원 형태:
 *   1) 리다이렉트: url/redirectUrl/authUrl/paymentUrl/actionUrl 중 하나가 있으면 그 주소로 이동
 *   2) 폼 전송(form POST): action/formAction/postUrl 이 있으면 나머지 필드를 hidden 으로 POST
 *   3) 둘 다 없으면(목 즉시완료 등): false 반환 → 호출부가 별도로 복구/안내
 *
 * 주의: `returnUrl`(앱 복귀 URL)은 **실행 목적지가 아니다**. 과거엔 returnUrl 을 리다이렉트
 * 대상으로 오인해 provider 로 POST 하지 않고 바로 앱으로 돌아가는 결함이 있었다(교차검수 §11).
 * returnUrl 은 form POST 시 provider 에 전달할 "필드"로만 취급하고, 우리 이동 대상으로 쓰지 않는다.
 *
 * 창을 띄우면 현재 페이지를 떠나므로, 복귀 시 흐름을 이어가기 위한 최소 참조값만
 * sessionStorage 에 둔다(이름·전화·토큰 등 PII/비밀값은 절대 저장하지 않는다).
 */

import type { GuestOrderStateResponse } from "@/types/guest-monitoring";

type LaunchObject = Record<string, string>;

// returnUrl 제외 — 복귀 URL 을 실행 목적지로 오인하지 않는다(§11).
const URL_KEYS = ["redirectUrl", "url", "authUrl", "paymentUrl", "actionUrl"];
const ACTION_KEYS = ["action", "formAction", "postUrl"];

/**
 * 서버가 준 실행 정보로 외부 창(현재 창 리다이렉트)을 띄운다.
 * @returns 이동/전송을 시작했으면 true, 실행 정보가 비어 있으면 false(복구/안내 흐름으로)
 */
export function launchProvider(launch: LaunchObject | null | undefined): boolean {
  if (!launch || typeof launch !== "object") return false;

  const urlKey = URL_KEYS.find((k) => typeof launch[k] === "string" && launch[k]);
  if (urlKey) {
    window.location.assign(launch[urlKey]);
    return true;
  }

  const actionKey = ACTION_KEYS.find((k) => typeof launch[k] === "string" && launch[k]);
  if (actionKey) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = launch[actionKey];
    for (const [k, v] of Object.entries(launch)) {
      if (ACTION_KEYS.includes(k)) continue; // 실행 메타는 전송 필드에서 제외(returnUrl 등 일반 필드는 포함)
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = String(v);
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    return true;
  }

  return false;
}

/**
 * 주문 상태를 UI 분류로 환산한다(설계 §4.1 상태 전이).
 *  - applied : 결제 승인 + 활성화 완료(done)
 *  - settling: 승인 대기(pending)·승인 후 적용 대기(paid&!applied)·수동 확인(needs_review)
 *              → 재결제 유도 금지, 상태 재조회로 복구
 *  - failed  : 확정 실패/취소/환불 → 새 결제는 새 멱등키 발급
 */
export function classifyOrderState(d: GuestOrderStateResponse): "applied" | "settling" | "failed" {
  if (d.applied && d.status === "paid") return "applied";
  if (d.status === "pending" || d.status === "needs_review" || (d.status === "paid" && !d.applied)) {
    return "settling";
  }
  return "failed"; // failed | canceled | refunded
}

// ── 리다이렉트 복귀 상태(비밀/PII 미저장) ──────────────────────────────

const DRAFT_KEY = "vestra.guest.draftId";
const ORDERS_KEY = "vestra.guest.orders"; // 대상별 주문 시도 레지스트리(JSON)
const PENDING_IDENTITY_KEY = "vestra.guest.pendingIdentity"; // 인증창으로 떠났음을 표시(복귀 식별)

function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* 프라이빗 모드 등 — 무시(복구는 서버 상태 조회로 보강) */
  }
}

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* 무시 */
  }
}

/** 주문 시도 대상 키. 같은 주문 재시도엔 동일 키, 다른 물건엔 별도 키(§7). */
export function orderTarget(
  purpose: "initial" | "renewal",
  id: string | null | undefined
): string {
  return `${purpose}:${id ?? ""}`;
}

interface OrderEntry {
  /** 멱등키: 같은 주문 재시도에 재사용(설계 §3.3). 대상별로 분리. */
  idempotencyKey: string;
  /** 생성된 주문 ID(미완료 주문 복구용). 주문 생성 전에는 없음. */
  orderId?: string;
}

type OrderMap = Record<string, OrderEntry>;

function readOrders(): OrderMap {
  const raw = safeGet(ORDERS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as OrderMap) : {};
  } catch {
    return {};
  }
}

function writeOrders(map: OrderMap) {
  safeSet(ORDERS_KEY, JSON.stringify(map));
}

function newUuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export const applyResume = {
  // ── draft (apply 흐름) ──
  setDraftId: (id: string) => safeSet(DRAFT_KEY, id),
  getDraftId: () => safeGet(DRAFT_KEY),
  clearDraftId: () => safeRemove(DRAFT_KEY),

  // ── 인증창 복귀 식별: 인증창으로 떠나기 직전 대상을 기록, 복귀 시 1회 소비 ──
  setPendingIdentity: (target: string) => safeSet(PENDING_IDENTITY_KEY, target),
  getPendingIdentity: () => safeGet(PENDING_IDENTITY_KEY),
  clearPendingIdentity: () => safeRemove(PENDING_IDENTITY_KEY),

  // ── 대상별 멱등키/주문 ──
  /** 대상별 멱등키 get-or-create. 같은 대상 재시도엔 동일 키를 유지한다(§3.3). */
  ensureIdempotencyKey: (target: string): string => {
    const map = readOrders();
    const existing = map[target]?.idempotencyKey;
    if (existing) return existing;
    const key = newUuid();
    map[target] = { ...map[target], idempotencyKey: key };
    writeOrders(map);
    return key;
  },
  setOrderId: (target: string, orderId: string) => {
    const map = readOrders();
    map[target] = { idempotencyKey: map[target]?.idempotencyKey ?? newUuid(), orderId };
    writeOrders(map);
  },
  getOrderId: (target: string): string | null => readOrders()[target]?.orderId ?? null,
  /** 확정 실패 후 "새 결제 시도"용: 해당 대상의 키·주문을 비워 다음 시도에 새 멱등키 발급 */
  clearOrder: (target: string) => {
    const map = readOrders();
    if (map[target]) {
      delete map[target];
      writeOrders(map);
    }
  },
  /** orderId 가 생성된(미완료 가능) 주문 목록 — 복귀 시 복구 대상 탐색용 */
  listPendingOrders: (): Array<{ target: string; orderId: string }> =>
    Object.entries(readOrders())
      .filter(([, v]) => !!v.orderId)
      .map(([target, v]) => ({ target, orderId: v.orderId as string })),

  /** 전체 초기화(흐름 종료/완전 리셋) */
  clear: () => {
    safeRemove(DRAFT_KEY);
    safeRemove(ORDERS_KEY);
    safeRemove(PENDING_IDENTITY_KEY);
  },
};

/** 신청 흐름 반환 URL 기준 경로(프로바이더 반환 후 흐름 재개) */
export const GUEST_APPLY_PATH = "/renewal/monitoring/guest/apply";
export const GUEST_STATUS_PATH = "/renewal/monitoring/guest/status";
