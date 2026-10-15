import { unavailable } from "@/lib/guest-monitoring/errors";
import { mockProvider } from "./mock";
import { getPortoneV1Config, resolvePaymentMode } from "./portone-v1-config";
import { portoneV1Provider } from "./portone-v1";
import type { DanalProvider } from "./types";
/** PortOne requires reviewed no-withdrawal channel evidence; other real providers stay disabled.
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
  const mode = resolvePaymentMode();
  if (mode === "portone_v1") { getPortoneV1Config(); return portoneV1Provider; }
  if (process.env.NODE_ENV !== "production" && mode === "mock" &&
      process.env.GUEST_MONITORING_MOCK_ISOLATED === "true" && isolatedDatabase() &&
      (process.env.DANAL_MOCK_SECRET?.length ?? 0) >= 32) return mockProvider;
  unavailable();
}
