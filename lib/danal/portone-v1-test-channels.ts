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
export const verifiedV1TestChannels: readonly VerifiedV1TestChannel[] = [];
