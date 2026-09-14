import { describe, it, expect } from "vitest";
import {
  makeSessionScoped,
  scopeSessionCookiesToBrowserSession,
} from "@/lib/session-cookie";

const hasExpiry = (s: string) => /(^|;)\s*(expires|max-age)=/i.test(s);

describe("makeSessionScoped — 세션 쿠키 만료속성 제거", () => {
  it("로그인 세션 쿠키(Expires)는 만료속성을 제거해 세션 쿠키화한다", () => {
    const input =
      "authjs.session-token=eyJ.ABC; Path=/; Expires=Thu, 15 Oct 2026 12:00:00 GMT; HttpOnly; SameSite=Lax; Secure";
    const out = makeSessionScoped(input);
    expect(hasExpiry(out)).toBe(false);
    expect(out).toContain("authjs.session-token=eyJ.ABC");
    expect(out).toContain("HttpOnly");
    expect(out).toContain("Secure");
  });

  it("Max-Age 형태도 제거한다", () => {
    const input =
      "__Secure-authjs.session-token=eyJ.X; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure";
    expect(hasExpiry(makeSessionScoped(input))).toBe(false);
  });

  it("청크 쿠키(.0/.1)도 매칭해 제거한다", () => {
    const input =
      "authjs.session-token.0=chunk; Path=/; Expires=Thu, 15 Oct 2026 12:00:00 GMT; HttpOnly";
    expect(hasExpiry(makeSessionScoped(input))).toBe(false);
  });

  it("로그아웃 삭제 쿠키(값 없음)는 그대로 둬 삭제가 유지된다", () => {
    const input =
      "authjs.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Max-Age=0";
    expect(makeSessionScoped(input)).toBe(input);
  });

  it("세션 쿠키가 아닌 CSRF/콜백 쿠키는 건드리지 않는다", () => {
    const csrf =
      "authjs.csrf-token=abc%7Cdef; Path=/; Expires=Thu, 15 Oct 2026 12:00:00 GMT; HttpOnly; SameSite=Lax";
    const cb = "authjs.callback-url=https%3A%2F%2Fx; Path=/; Max-Age=900; HttpOnly";
    expect(makeSessionScoped(csrf)).toBe(csrf);
    expect(makeSessionScoped(cb)).toBe(cb);
  });
});

describe("scopeSessionCookiesToBrowserSession — 응답 헤더 재작성", () => {
  it("세션 쿠키만 재작성하고 나머지 헤더는 보존한다", () => {
    const res = new Response("ok", { status: 200 });
    res.headers.append(
      "set-cookie",
      "authjs.session-token=eyJ.V; Path=/; Expires=Thu, 15 Oct 2026 12:00:00 GMT; HttpOnly; SameSite=Lax"
    );
    res.headers.append(
      "set-cookie",
      "authjs.csrf-token=t; Path=/; Max-Age=900; HttpOnly; SameSite=Lax"
    );
    res.headers.set("Cache-Control", "no-store");

    const out = scopeSessionCookiesToBrowserSession(res);
    const cookies = out.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith("authjs.session-token="))!;
    const csrf = cookies.find((c) => c.startsWith("authjs.csrf-token="))!;

    expect(hasExpiry(session)).toBe(false);
    expect(hasExpiry(csrf)).toBe(true); // CSRF는 유지
    expect(out.headers.get("Cache-Control")).toBe("no-store");
    expect(out.status).toBe(200);
  });

  it("Set-Cookie가 없으면 원본 응답을 그대로 반환한다", () => {
    const res = new Response("ok", { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    expect(scopeSessionCookiesToBrowserSession(res)).toBe(res);
  });
});
