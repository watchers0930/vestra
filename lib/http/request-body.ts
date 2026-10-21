export class JsonBodyError extends Error {
  constructor(public status: 400 | 413) { super("invalid_body"); }
}

/** Content-Length와 무관하게 실제 수신 바이트를 제한한 뒤 JSON을 파싱한다. */
export async function readLimitedJson(req: Request, limit: number): Promise<unknown> {
  const length = req.headers.get("content-length");
  if (length && Number(length) > limit) throw new JsonBodyError(413);
  if (!req.body) throw new JsonBodyError(400);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        // 취소 실패가 413을 다른 오류로 바꾸지 않도록 한다.
        await reader.cancel().catch(() => {});
        throw new JsonBodyError(413);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } catch (error) {
    if (error instanceof JsonBodyError) throw error;
    throw new JsonBodyError(400);
  } finally { reader.releaseLock(); }
}
