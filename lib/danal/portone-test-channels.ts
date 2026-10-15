/** Reviewed console evidence, never a client/env `test:true` switch.
 * Add an entry only after §0.1 of portone.design.md is verified for that store:
 * V2 Danal PAYMENT support, no-withdrawal TEST channel, supported SDK payMethod,
 * SDK version/currency and REST channel fields. Never add secrets or personal data.
 * No qualifying evidence is available yet, so SDK launch is deliberately disabled.
 */
export interface VerifiedTestChannel {
  storeId: string;
  channelKey: string;
  payMethod: string;
  pgProvider: string;
  evidence: string;
}
export const verifiedTestChannels: readonly VerifiedTestChannel[] = [];
