import { NextRequest } from "next/server";

function hasSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some(({ name }) =>
    name === "authjs.session-token" ||
    name === "__Secure-authjs.session-token" ||
    name === "next-auth.session-token" ||
    name === "__Secure-next-auth.session-token"
  );
}

const CALLBACK_COOKIE_NAMES = [
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

function isValidCallbackUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeAuthRequest(req: NextRequest): Request {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return req;

  const cookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  let changed = false;

  const filteredCookies = cookies.filter((cookie) => {
    const eqIndex = cookie.indexOf("=");
    if (eqIndex === -1) return true;

    const name = cookie.slice(0, eqIndex).trim();
    if (!CALLBACK_COOKIE_NAMES.includes(name)) return true;

    const rawValue = cookie.slice(eqIndex + 1);
    const decodedValue = decodeURIComponent(rawValue);
    const isValid = isValidCallbackUrl(decodedValue);
    if (!isValid) changed = true;
    return isValid;
  });

  if (!changed) return req;

  const headers = new Headers(req.headers);
  if (filteredCookies.length > 0) {
    headers.set("cookie", filteredCookies.join("; "));
  } else {
    headers.delete("cookie");
  }

  return new Request(req.url, {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error Node/undici requires duplex when forwarding a streamed body.
    duplex: "half",
  });
}

function getProviderSignInPath(pathname: string) {
  const match = pathname.match(/\/api\/auth\/signin\/([^/]+)$/);
  return match?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const safeReq = sanitizeAuthRequest(req);
  const pathname = req.nextUrl.pathname;
  const isSessionRequest = pathname.endsWith("/session");
  const provider = getProviderSignInPath(pathname);

  if (provider) {
    const startUrl = new URL(`/api/social-auth/start/${provider}`, req.url);
    req.nextUrl.searchParams.forEach((value, key) => {
      startUrl.searchParams.set(key, value);
    });
    return Response.redirect(startUrl);
  }

  if (isSessionRequest && !hasSessionCookie(req)) {
    return Response.json(null, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  try {
    const { createDynamicAuth } = await import("@/lib/auth");
    const { handlers } = await createDynamicAuth();
    return await handlers.GET(safeReq as never);
  } catch (error) {
    console.error("[auth] dynamic GET fallback:", error);
    const { handlers: staticHandlers } = await import("@/lib/auth");
    return staticHandlers.GET(safeReq as never);
  }
}

export async function POST(req: NextRequest) {
  const safeReq = sanitizeAuthRequest(req);
  try {
    const { createDynamicAuth } = await import("@/lib/auth");
    const { handlers } = await createDynamicAuth();
    return await handlers.POST(safeReq as never);
  } catch (error) {
    console.error("[auth] dynamic POST fallback:", error);
    const { handlers: staticHandlers } = await import("@/lib/auth");
    return staticHandlers.POST(safeReq as never);
  }
}
