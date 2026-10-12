import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { Auth, type AuthConfig } from "@auth/core";

vi.mock("next-auth", () => ({ default: vi.fn(() => ({})) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/system-settings", () => ({ getOAuthSettings: vi.fn() }));
vi.mock("@/lib/audit-log", () => ({ logAudit: vi.fn() }));

let config: AuthConfig;
const origin = "https://vestra.example";

beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "naver-auth-regression-test-secret");
  const { buildProviders } = await import("@/lib/auth");
  config = {
    secret: "naver-auth-regression-test-secret",
    trustHost: true,
    basePath: "/api/auth",
    providers: buildProviders({ NAVER_CLIENT_ID: "test-client", NAVER_CLIENT_SECRET: "test-secret" })
      .filter(provider => typeof provider !== "function" && provider.id === "naver"),
    logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
});

afterAll(() => vi.unstubAllEnvs());

async function startSignup() {
  const csrf = await Auth(new Request(`${origin}/api/auth/csrf`), config);
  const { csrfToken } = await csrf.json();
  const cookie = csrf.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  const response = await Auth(new Request(`${origin}/api/auth/signin/naver`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    body: new URLSearchParams({ csrfToken, callbackUrl: `${origin}/signup/complete?intendedRole=PERSONAL` }),
  }), config);
  return { response, url: new URL(response.headers.get("location")!) };
}

describe("Naver OAuth request and callback", () => {
  it("sends the required state and keeps PKCE and the signup destination", async () => {
    const { response, url } = await startSignup();
    expect(url.origin).toBe("https://nid.naver.com");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/naver`);
    const cookies = response.headers.getSetCookie();
    expect(cookies.some(value => value.startsWith("__Secure-authjs.state="))).toBe(true);
    expect(cookies.some(value => value.startsWith("__Secure-authjs.callback-url=") &&
      decodeURIComponent(value).includes("/signup/complete?intendedRole=PERSONAL"))).toBe(true);
  });

  it("rejects a mismatched callback state before requesting an access token", async () => {
    const { response } = await startSignup();
    const cookie = response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected token request"));
    try {
      const callback = await Auth(new Request(`${origin}/api/auth/callback/naver?code=test-code&state=wrong-state`, {
        headers: { cookie },
      }), config);
      expect(new URL(callback.headers.get("location")!).searchParams.get("error")).toBe("Configuration");
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
});
