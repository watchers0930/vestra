import { NextResponse } from "next/server";
import { MemberError } from "./errors";
import { memberJson } from "./http";
import { OnboardingIncompleteError, requireOnboardingComplete } from "./onboarding";
import { isOnboardingProtectedPath } from "./protected-paths";

// Re-export so existing server callers/tests keep importing from this module.
export { isOnboardingProtectedPath };

/**
 * Server/API onboarding gate returning a Response (for route handlers or any
 * context that can reach the DB). The Edge middleware does NOT use this — it
 * gates optimistically from the JWT flag (token.needsPaidOnboarding) and never
 * touches the DB. userId must come from a verified session, never request
 * parameters or headers.
 */
export async function onboardingAccessResponse(userId: string, url: URL): Promise<Response | null> {
  if (!isOnboardingProtectedPath(url.pathname)) return null;
  try {
    await requireOnboardingComplete(userId);
    return null;
  } catch (error) {
    if (error instanceof OnboardingIncompleteError) {
      const step = error.state.stage === "verify" ? 2 : 3;
      const response = NextResponse.redirect(new URL(`/signup/business/step-${step}`, url.origin));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    // A DB failure must not allow entry; recovery endpoints are outside this gate.
    const normalized = error instanceof MemberError ? error : new MemberError("provider_unavailable");
    return memberJson({ error: normalized.message, code: normalized.code }, normalized.status, normalized.headers);
  }
}
