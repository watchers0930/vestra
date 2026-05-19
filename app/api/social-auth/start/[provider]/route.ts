import { NextRequest } from "next/server";

function appendSetCookies(target: Headers, source: Headers) {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") {
    for (const cookie of getSetCookie.call(source)) {
      target.append("set-cookie", cookie);
    }
    return;
  }

  const single = source.get("set-cookie");
  if (single) target.append("set-cookie", single);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { createDynamicAuth } = await import("@/lib/auth");
  const { provider } = await context.params;
  const { handlers } = await createDynamicAuth();
  const callbackUrl =
    req.nextUrl.searchParams.get("callbackUrl") ??
    new URL("/login", req.url).toString();

  const csrfRes = await handlers.GET(
    new Request(new URL("/api/auth/csrf", req.url), {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
    }) as never
  );

  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) {
    return Response.redirect(new URL("/api/auth/error?error=Configuration", req.url));
  }

  const csrfCookie = csrfRes.headers.get("set-cookie")?.split(";")[0];
  const postCookieHeader = [req.headers.get("cookie"), csrfCookie]
    .filter(Boolean)
    .join("; ");

  const signInRes = await handlers.POST(
    new Request(new URL(`/api/auth/signin/${provider}`, req.url), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-auth-return-redirect": "1",
        cookie: postCookieHeader,
      },
      body: new URLSearchParams({
        csrfToken,
        callbackUrl,
      }).toString(),
      // @ts-expect-error undici duplex requirement for request body forwarding.
      duplex: "half",
    }) as never
  );

  const payload = (await signInRes.json().catch(() => null)) as { url?: string } | null;
  const destination = payload?.url || new URL("/api/auth/error?error=Configuration", req.url).toString();

  const response = new Response(null, {
    status: 302,
    headers: {
      location: destination,
    },
  });
  appendSetCookies(response.headers, csrfRes.headers);
  appendSetCookies(response.headers, signInRes.headers);
  return response;
}
