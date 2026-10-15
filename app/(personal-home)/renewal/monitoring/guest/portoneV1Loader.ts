/**
 * 비회원 등기감시 — PortOne V1(구 아임포트) 브라우저 SDK 로더(설계 §1.1/§4.7, 신규).
 *
 * 책임: `https://cdn.iamport.kr/v1/iamport.js`를 동적 script로 로드하고 `window.IMP`를 확보한다.
 * npm 설치(@portone/browser-sdk)는 쓰지 않는다(설계 §4.5). 이 파일은 "script 수명주기"만 책임지며,
 * 결제 프로토콜(init/request_pay 호출)은 guestPayment.ts가 담당한다(단일 책임, 절대규칙 §2).
 *
 * 견고성(§4.7 — P1-①):
 *   - 성공한 로드만 공유한다(중복 script·중복 결제창 방지, 동시 호출은 같은 Promise를 공유).
 *   - script error·timeout·로드 후 IMP 미존재 시 실패 script·핸들러·타이머를 정리하고 캐시된 rejected
 *     Promise를 **초기화**한다. 다음 명시 재시도는 새 로드를 시작해야 하며, rejected Promise 재사용으로
 *     영구 실패하지 않는다.
 */

const CDN_SRC = "https://cdn.iamport.kr/v1/iamport.js";
/** script 로드 타임아웃(ms). 서버 REST(8s)와 별개로 브라우저 리소스 로드 상한. */
const LOAD_TIMEOUT_MS = 10_000;

/** V1 IMP 전역 객체의 최소 계약(설계 §5.1). 필요한 두 메서드만 좁혀 쓴다. */
export interface PortOneV1Imp {
  init: (impCode: string) => void;
  request_pay: (
    params: Record<string, unknown>,
    callback: (response: PortOneV1PayResponse) => void
  ) => void;
}

/** request_pay 콜백 응답(설계 §5.1 §4.5). success는 "서버 확인 시작" 신호일 뿐 승인 근거가 아니다. */
export interface PortOneV1PayResponse {
  success?: boolean;
  imp_uid?: string | null;
  merchant_uid?: string | null;
  error_code?: string | null;
  error_msg?: string | null;
}

declare global {
  interface Window {
    IMP?: PortOneV1Imp;
  }
}

/** 성공한 로드만 공유한다. 실패 시 null로 되돌려 다음 명시 재시도가 새 로드를 시작한다(§4.7). */
let cached: Promise<PortOneV1Imp> | null = null;

/** window.IMP가 실제로 사용 가능한 형태인지 확인(로드만 되고 IMP 미노출인 경우를 걸러낸다). */
function hasUsableImp(w: Window): w is Window & { IMP: PortOneV1Imp } {
  const imp = w.IMP;
  return !!imp && typeof imp.init === "function" && typeof imp.request_pay === "function";
}

/**
 * V1 SDK를 로드하고 사용 가능한 `window.IMP`로 resolve한다.
 * 실패(스크립트 오류·타임아웃·IMP 미존재)는 reject하며, 캐시를 비워 다음 호출이 새 로드를 시작하게 한다.
 */
export function loadPortOneV1(): Promise<PortOneV1Imp> {
  if (cached) return cached;

  const promise = new Promise<PortOneV1Imp>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("no_window"));
      return;
    }
    // 이전 로드/다른 경로로 이미 IMP가 있으면 그대로 공유(중복 script 생성 방지).
    if (hasUsableImp(window)) {
      resolve(window.IMP);
      return;
    }

    const script = document.createElement("script");
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    // 실패 정리: 핸들러·타이머 해제 + 실패 script 제거. 캐시 초기화는 아래 promise.catch가 담당한다.
    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      reject(new Error(reason));
    };

    const onLoad = () => {
      if (settled) return;
      if (hasUsableImp(window)) {
        settled = true;
        cleanup();
        resolve(window.IMP);
      } else {
        // 스크립트는 로드됐으나 IMP가 노출되지 않음 → 실패로 정리(§4.7).
        fail("imp_missing");
      }
    };
    const onError = () => fail("script_error");

    script.src = CDN_SRC;
    script.async = true;
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    timer = setTimeout(() => fail("timeout"), LOAD_TIMEOUT_MS);
    document.head.appendChild(script);
  });

  cached = promise;
  // rejected Promise가 캐시에 남아 영구 실패하지 않도록, 거부 시 캐시를 비운다(§4.7 핵심).
  // 다른 로드가 이미 새로 시작됐다면(cached !== promise) 건드리지 않는다.
  promise.catch(() => {
    if (cached === promise) cached = null;
  });
  return promise;
}
