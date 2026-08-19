/**
 * 서버 사이드 모바일 기기 감지 (User-Agent 기반).
 *
 * 매물검색 등 renewal 서브 화면은 PC 라우트와 모바일 전용 `-mobile` 라우트가
 * 분리되어 있어, PC 라우트 진입 시 모바일 기기면 `-mobile`로 리다이렉트한다.
 * 실기기 + 브라우저 devtools 디바이스 모드(모바일 UA 주입) 모두 감지된다.
 */
const MOBILE_UA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i;

export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return MOBILE_UA.test(ua);
}
