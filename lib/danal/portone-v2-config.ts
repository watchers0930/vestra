// PortOne V2 설정. V1(portone-v1-config.ts)과 병행 — 점진 전환용.
// V2는 토큰 발급(/users/getToken)이 없고 API Secret을 직접 헤더로 쓴다.
import { unavailable } from "@/lib/guest-monitoring/errors";

export function getPortoneV2Config() {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_V2_STORE_ID?.trim();         // store-xxxx (공개)
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_V2_CHANNEL_KEY?.trim();   // channel-key-xxxx (공개, 클라 SDK)
  const apiSecret = process.env.PORTONE_V2_API_SECRET?.trim();                 // V2 API Secret (서버 전용·비밀)
  if (!storeId || !channelKey || !apiSecret) return unavailable();
  return { storeId, channelKey, apiSecret };
}
