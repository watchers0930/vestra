import { endpoint, json, readJson } from "@/lib/guest-monitoring/http";
import { paymentCallback } from "@/lib/guest-monitoring/activation";
import { getDanalProvider } from "@/lib/danal";
export const POST = endpoint(async req => {
  getDanalProvider();
  return json(await paymentCallback(await readJson(req)));
}, { callback: true });
