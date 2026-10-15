import { createDraft } from "@/lib/guest-monitoring/draft";
import { endpoint, json, boundedBody } from "@/lib/guest-monitoring/http";
import { ipLimit } from "@/lib/guest-monitoring/rate-limit-keys";
import { GuestError } from "@/lib/guest-monitoring/errors";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = endpoint(async req => {
  await ipLimit(req, "parse-pdf", 10);
  const body = await boundedBody(req, 11 * 1024 * 1024);
  let form: FormData;
  try { form = await new Response(new Uint8Array(body), { headers: { "content-type": req.headers.get("content-type") || "" } }).formData(); }
  catch { throw new GuestError("invalid_input"); }
  return json(await createDraft(form));
}, { upload: true });
