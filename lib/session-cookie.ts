// 브라우저 닫힘 = 로그아웃을 위한 세션 쿠키 재작성 유틸.
//
// Auth.js v5 코어는 JWT 세션 쿠키에 항상 `Expires = now + session.maxAge`(기본 30일)를
// 주입한다(callback/index.js·session.js). 쿠키 옵션에서 maxAge를 빼도 무효다.
// → 응답 Set-Cookie에서 세션 쿠키의 Expires/Max-Age를 제거해 "세션 쿠키"(브라우저 닫으면
//   삭제)로 되돌린다. 단, 로그아웃 시 만료 삭제 쿠키(값이 빈 값)는 그대로 두어 삭제가 되게 한다.

const SESSION_COOKIE_BASES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

/** "name=value; Attr=..." 형태의 단일 Set-Cookie 문자열에서 세션 쿠키면 만료속성 제거 */
export function makeSessionScoped(setCookie: string): string {
  const eq = setCookie.indexOf("=");
  if (eq === -1) return setCookie;
  const name = setCookie.slice(0, eq).trim();
  // 청크 쿠키(authjs.session-token.0 등)까지 포함해 매칭
  const isSessionCookie = SESSION_COOKIE_BASES.some(
    (base) => name === base || name.startsWith(base + ".")
  );
  if (!isSessionCookie) return setCookie;

  // 값 추출: 첫 번째 세미콜론 전까지가 name=value
  const firstSemi = setCookie.indexOf(";");
  const value = (
    firstSemi === -1 ? setCookie.slice(eq + 1) : setCookie.slice(eq + 1, firstSemi)
  ).trim();
  // 삭제 쿠키(값 없음)는 만료속성을 유지해야 실제로 삭제된다
  if (value === "") return setCookie;

  // Expires / Max-Age 속성 제거 → 세션 쿠키화
  return setCookie
    .split(";")
    .filter((part) => {
      const attr = part.trim().toLowerCase();
      return !attr.startsWith("expires=") && !attr.startsWith("max-age=");
    })
    .join(";");
}

/** 응답의 Set-Cookie 헤더 중 세션 쿠키만 브라우저 세션 스코프로 재작성 */
export function scopeSessionCookiesToBrowserSession(res: Response): Response {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) return res;

  const rewritten = setCookies.map(makeSessionScoped);
  // 변경 없으면 원본 그대로 반환
  if (rewritten.every((c, i) => c === setCookies[i])) return res;

  const headers = new Headers(res.headers);
  headers.delete("set-cookie");
  for (const cookie of rewritten) headers.append("set-cookie", cookie);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
