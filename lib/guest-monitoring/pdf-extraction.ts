import { getDocumentProxy, extractText } from "unpdf";
import { join } from "node:path";
import { parseRegistry } from "@/lib/registry-parser";
import { detectRegistryConfidence } from "@/lib/pdf-parser";
import { GuestError } from "./errors";
export function extractCommUniqueNoFromText(text: string): string | null {
  return text.match(/고유번호[\s:：]+(\d{4}-\d{4}-\d{6})/)?.[1] || null;
}
export function normalizeAddress(address: string) {
  return address.normalize("NFKC").replace(/서울특별시/g, "서울").replace(/부산광역시/g, "부산")
    .replace(/경기도/g, "경기").replace(/[\s,()[\]]/g, "");
}
export function extractRegistryFields(text: string, inputAddress: string) {
  if (!detectRegistryConfidence(text).isRegistry || !/갑\s*구/.test(text)) throw new GuestError("not_registry");
  const numbers = [...text.matchAll(/고유번호[\s:：]+(\d{4}-\d{4}-\d{6})/g)].map(v => v[1]);
  if (new Set(numbers).size > 1) throw new GuestError("multiple_properties");
  const commUniqueNo = extractCommUniqueNoFromText(text);
  const parsed = parseRegistry(text);
  const owners = parsed.gapgu.filter(e => e.purpose.includes("소유권") && !e.isCancelled);
  const owner = owners.at(-1);
  const ownerName = owner?.holder?.trim();
  // Ambiguous joint/corporate or masked owners fail closed pending explicit support policy.
  if (!commUniqueNo || !ownerName || !/^[가-힣]{2,10}$/.test(ownerName) ||
      /공유자|공동소유|주식회사|유한회사/.test(owner?.detail || "")) throw new GuestError("extraction_incomplete");
  const address = parsed.title.address?.trim();
  if (!address || normalizeAddress(address) !== normalizeAddress(inputAddress)) throw new GuestError("address_mismatch");
  return { commUniqueNo, ownerName, address };
}
/** Limit pages before text extraction; destroy PDF resources on every exit. */
export async function extractGuestPDF(buffer: Buffer) {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer), {
      cMapUrl: join(process.cwd(), "node_modules/pdfjs-dist/cmaps/"), cMapPacked: true,
      isEvalSupported: false,
    });
    if (pdf.numPages < 1 || pdf.numPages > 40) throw new GuestError("invalid_pdf");
    const result = await extractText(pdf, { mergePages: true });
    if (!result.text || result.text.length < 50 || result.text.length > 300_000) throw new GuestError("invalid_pdf");
    return result.text;
  } catch (e) {
    if (e instanceof GuestError) throw e;
    throw new GuestError("invalid_pdf");
  } finally { await pdf?.destroy(); }
}
