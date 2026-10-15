import { unavailable } from "@/lib/guest-monitoring/errors";
import { mockProvider } from "./mock";
import type { DanalProvider } from "./types";
/** Real protocol/keys are not approved yet. Fail closed even when placeholder keys exist.
 * Local fixtures require: DANAL_PROVIDER=mock, GUEST_MONITORING_MOCK_ISOLATED=true,
 * DANAL_MOCK_SECRET (32+ chars), and a loopback DATABASE_URL containing guest/test.
 */
function isolatedDatabase() {
  try {
    const url = new URL(process.env.DATABASE_URL || "");
    return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && /guest|test/i.test(url.pathname);
  } catch { return false; }
}
export function getDanalProvider(): DanalProvider {
  if (process.env.NODE_ENV !== "production" && process.env.DANAL_PROVIDER === "mock" &&
      process.env.GUEST_MONITORING_MOCK_ISOLATED === "true" && isolatedDatabase() &&
      (process.env.DANAL_MOCK_SECRET?.length ?? 0) >= 32) return mockProvider;
  unavailable();
}
