import { readLimitedJson } from "../http/request-body";
export { JsonBodyError as ChecklistBodyError } from "../http/request-body";
import { NextResponse } from "next/server";
export const privateJson = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
/** 체크리스트는 실제 UTF-8 바이트 기준 16KB로 제한한다. */
export async function readChecklistBody(req: Request): Promise<unknown> {
  return readLimitedJson(req, 16 * 1024);
}
