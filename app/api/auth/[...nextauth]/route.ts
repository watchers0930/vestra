import { NextRequest } from "next/server";
import { createDynamicAuth, handlers as staticHandlers } from "@/lib/auth";

function hasSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some(({ name }) =>
    name === "authjs.session-token" ||
    name === "__Secure-authjs.session-token" ||
    name === "next-auth.session-token" ||
    name === "__Secure-next-auth.session-token"
  );
}

export async function GET(req: NextRequest) {
  if (!hasSessionCookie(req)) {
    return Response.json(null, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  try {
    const { handlers } = await createDynamicAuth();
    return await handlers.GET(req);
  } catch (error) {
    console.error("[auth] dynamic GET fallback:", error);
    return staticHandlers.GET(req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { handlers } = await createDynamicAuth();
    return await handlers.POST(req);
  } catch (error) {
    console.error("[auth] dynamic POST fallback:", error);
    return staticHandlers.POST(req);
  }
}
