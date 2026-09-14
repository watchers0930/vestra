import { NextRequest } from "next/server";
import { scopeSessionCookiesToBrowserSession } from "@/lib/session-cookie";

function hasSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some(({ name }) =>
    name === "authjs.session-token" ||
    name === "__Secure-authjs.session-token" ||
    name === "next-auth.session-token" ||
    name === "__Secure-next-auth.session-token"
  );
}

export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isSessionRequest = pathname.endsWith("/session");

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
    return scopeSessionCookiesToBrowserSession(await handlers.GET(req));
  } catch (error) {
    console.error("[auth] dynamic GET fallback:", error);
    const { handlers: staticHandlers } = await import("@/lib/auth");
    return scopeSessionCookiesToBrowserSession(await staticHandlers.GET(req));
  }
}

export async function POST(req: NextRequest) {
  try {
    const { createDynamicAuth } = await import("@/lib/auth");
    const { handlers } = await createDynamicAuth();
    return scopeSessionCookiesToBrowserSession(await handlers.POST(req));
  } catch (error) {
    console.error("[auth] dynamic POST fallback:", error);
    const { handlers: staticHandlers } = await import("@/lib/auth");
    return scopeSessionCookiesToBrowserSession(await staticHandlers.POST(req));
  }
}
