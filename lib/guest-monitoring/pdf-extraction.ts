import { getDocumentProxy, extractText } from "unpdf";
import { join } from "node:path";
import { parseRegistry } from "@/lib/registry-parser";
import { detectRegistryConfidence } from "@/lib/pdf-parser";
import { registryPropertyFields } from "./property-fields";
import { GuestError } from "./errors";
export function extractCommUniqueNoFromText(text: string): string | null {
  return text.match(/고유번호[\s:：]+(\d{4}-\d{4}-\d{6})/)?.[1] || null;
}
export function normalizeAddress(address: string) {
  return address.normalize("NFKC").replace(/서울특별시/g, "서울").replace(/부산광역시/g, "부산")
    .replace(/경기도/g, "경기").replace(/[\s,()[\]]/g, "");
}
export function extractRegistryFields(text: string) {
  if (!detectRegistryConfidence(text).isRegistry || !/갑\s*구/.test(text)) throw new GuestError("not_registry");
  const numbers = [...text.matchAll(/고유번호[\s:：]+(\d{4}-\d{4}-\d{6})/g)].map(v => v[1]);
  if (new Set(numbers).size > 1) throw new GuestError("multiple_properties");
  const commUniqueNo = extractCommUniqueNoFromText(text);
  const parsed = parseRegistry(text);
  // 현재 소유자만 — 소유권보존/이전만 인정하고 가등기·청구권·가처분·예고·신탁은 제외한다.
  // (소유권이전청구권"가등기" 권리자를 현재 소유자로 오판해 명의도용 대조를 통과하는 결함 차단)
  const owners = parsed.gapgu.filter(e =>
    /소유권\s*(보존|이전)/.test(e.purpose) &&
    !/가등기|청구권|가처분|예고|신탁/.test(e.purpose) && !e.isCancelled);
  const owner = owners.at(-1);
  const ownerName = owner?.holder?.trim();
  const ownerRaw = owner?.detail || "";
  // 마스킹된 소유자명(최현*·최○우 등)은 부분 이름으로 추출돼 owner 대조를 우회할 수 있어 거부.
  // 발급 등기부등본의 소유자명은 마스킹되지 않으므로 이름 인접 마스킹 문자는 비정상 신호.
  const maskedOwner = /[가-힣][*○●◯∗＊·∙･☆﹡]|[*○●◯∗＊][가-힣]/.test(ownerRaw);
  // Ambiguous joint/corporate or masked owners fail closed pending explicit support policy.
  if (!commUniqueNo || !ownerName || !/^[가-힣]{2,10}$/.test(ownerName) || maskedOwner ||
      /공유자|공동소유|주식회사|유한회사/.test(ownerRaw)) throw new GuestError("extraction_incomplete");
  const fields = registryPropertyFields(parsed.title, text);
  if (!parsed.title.address?.trim() || (fields.unitNumber.isAggregate && !fields.unitNumber.unitHo)) {
    throw new GuestError("extraction_incomplete");
  }
  return { commUniqueNo, ownerName, ...fields };
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
