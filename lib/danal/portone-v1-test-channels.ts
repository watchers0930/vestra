/** No console evidence or sanitized V1 transaction is available yet.
 * Add entries only after design §0.1 verifies the no-withdrawal channel,
 * response fields, pg.MID compatibility and channel encryption-key setup.
 * Environment flags and matching account numbers are not evidence.
 */
export interface VerifiedV1TestChannel {
  impCode: string;
  mid: string;
  pgProvider: "danal_tpay";
  payMethod: "card";
  evidence: string;
}
export const verifiedV1TestChannels: readonly VerifiedV1TestChannel[] = [
  {
    impCode: "imp88200033",
    mid: "9810030929",
    pgProvider: "danal_tpay",
    payMethod: "card",
    // PortOne 콘솔 '테스트' 탭 실증(2026-10-15, Aside 읽기전용): 결제 다날 채널 '베스트라',
    // PG Provider=danal_tpay, 결제창 일반결제(카드, pay_method=card), MID 9810030929,
    // 채널키 channel-key-5b904392…. 무출금 테스트 채널.
    evidence: "PortOne console 테스트 탭 확인 2026-10-15: danal_tpay/card, store-cd0c7ced, MID 9810030929 (no-withdrawal test)",
  },
];
