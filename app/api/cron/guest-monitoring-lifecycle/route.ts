import { endpoint, json } from "@/lib/guest-monitoring/http";
import { runGuestLifecycle } from "@/lib/guest-monitoring/expiry";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export const GET = endpoint(async () => json(await runGuestLifecycle()), { cron: true });
