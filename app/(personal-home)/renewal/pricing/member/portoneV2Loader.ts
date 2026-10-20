/**
 * 회원 선불 구독 — PortOne V2 브라우저 SDK 로더(설계 §5.1, V1→V2 전환).
 *
 * 책임: `@portone/browser-sdk/v2` 모듈을 동적 import로 확보한다. V1과 달리 npm 패키지라 CDN script
 * 수명주기가 필요 없고, 코드 스플리팅을 위해 dynamic import만 캐시한다(단일 책임, 절대규칙 §2).
 * 결제 프로토콜(requestPayment)은 memberPayment.ts가 담당한다. 비회원 경로(lib/danal·guest/*)를
 * import하지 않고 회원 경로에 독립 구현한다.
 *
 * 견고성(§4.9): 성공한 import만 공유하고, 실패 시 캐시된 rejected Promise를 비워 다음 명시 재시도가
 * 새 import를 시작하게 한다(rejected Promise 재사용으로 영구 실패하지 않음).
 */

/** V2 requestPayment 요청(설계 §5.1). 서버가 내려준 값만 사용하며 외부 입력을 섞지 않는다. */
export interface PortOneV2Request {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: "CURRENCY_KRW";
  payMethod: "CARD";
  redirectUrl?: string;
}

/**
 * V2 requestPayment 응답(설계 §5.1). `code`가 있으면 실패/취소, 없으면 성공이며 `paymentId`가 유효하다.
 * 승인 근거가 아니라 "서버 확인 시작" 신호일 뿐이다(서버 REST 재조회가 유일 판정).
 */
export interface PortOneV2PayResponse {
  code?: string | null;
  message?: string | null;
  paymentId?: string | null;
  transactionType?: string | null;
  txId?: string | null;
}

export interface PortOneV2Sdk {
  requestPayment: (request: PortOneV2Request) => Promise<PortOneV2PayResponse | undefined>;
}

/** 성공한 import만 공유한다. 실패 시 null로 되돌려 다음 명시 재시도가 새 import를 시작한다(§4.9). */
let cached: Promise<PortOneV2Sdk> | null = null;

/** import 결과가 실제 requestPayment를 노출하는지 확인(모듈 shape 변화 방어). */
function toSdk(mod: unknown): PortOneV2Sdk {
  const m = mod as { requestPayment?: unknown; default?: { requestPayment?: unknown } };
  const fn = typeof m.requestPayment === "function" ? m.requestPayment : m.default?.requestPayment;
  if (typeof fn !== "function") throw new Error("sdk_missing");
  return { requestPayment: fn as PortOneV2Sdk["requestPayment"] };
}

export function loadPortOneV2(): Promise<PortOneV2Sdk> {
  if (cached) return cached;
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  const promise = import("@portone/browser-sdk/v2").then(toSdk);
  cached = promise;
  // rejected Promise가 캐시에 남아 영구 실패하지 않도록, 거부 시 캐시를 비운다(§4.9 핵심).
  promise.catch(() => {
    if (cached === promise) cached = null;
  });
  return promise;
}
