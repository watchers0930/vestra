/**
 * Tilko 등기신청사건 처리현황 프리체크 클라이언트
 * ────────────────────────────────────────────
 * 저비용 등기신청사건 조회로 조기 신호를 감지하고, 완료 신호가 있을 때
 * CODEF 등기부등본 상세 조회를 트리거한다.
 *
 * 실제 Tilko 상품별 URL/인증 헤더는 계약 설정에 맞춰 환경변수로 주입한다.
 */

import { apiCache, APICache } from "@/lib/api-cache";
import crypto from "crypto";

const DEFAULT_TILKO_BASE = "https://api.tilko.net";
const DEFAULT_CASE_STATUS_PATH = "/api/v2.0/Iros2IdLogin/RetrieveApplCsprCsList";
const DEFAULT_REGISTRY_DOC_PATH = "/api/v2.0/Iros2IdLogin/GetRegistryDocument";
const CASE_STATUS_CACHE_TTL = 20 * 60 * 1000;
const REGISTRY_DOC_CACHE_TTL = 60 * 60 * 1000;

export type TilkoCasePhase =
  | "none"
  | "received"
  | "in_progress"
  | "completed"
  | "dismissed"
  | "unknown";

export interface TilkoRegistryCase {
  receiptNo?: string;
  receiptDate?: string;
  status?: string;
  purpose?: string;
  applicant?: string;
  raw: Record<string, unknown>;
}

export interface TilkoCaseStatusResult {
  hasSignal: boolean;
  phase: TilkoCasePhase;
  summary: string;
  cases: TilkoRegistryCase[];
  rawData: Record<string, unknown>;
}

function getTilkoConfig() {
  const apiKey = process.env.TILKO_API_KEY;
  const publicKey = process.env.TILKO_PUBLIC_KEY;
  const irosId = process.env.TILKO_IROS_ID;
  const irosPassword = process.env.TILKO_IROS_PASSWORD;
  const caseStatusPath = process.env.TILKO_REGISTRY_CASE_STATUS_PATH || DEFAULT_CASE_STATUS_PATH;

  if (!apiKey || !publicKey || !irosId || !irosPassword) {
    throw new Error(
      "Tilko API 설정이 없습니다. (TILKO_API_KEY, TILKO_PUBLIC_KEY, TILKO_IROS_ID, TILKO_IROS_PASSWORD)"
    );
  }

  return {
    apiKey,
    publicKey,
    irosId,
    irosPassword,
    baseUrl: process.env.TILKO_API_BASE || DEFAULT_TILKO_BASE,
    caseStatusPath,
  };
}

export function isTilkoAvailable(): boolean {
  return !!(
    process.env.TILKO_API_KEY &&
    process.env.TILKO_PUBLIC_KEY &&
    process.env.TILKO_IROS_ID &&
    process.env.TILKO_IROS_PASSWORD
  );
}

export async function fetchRegistryCaseStatus(params: {
  reqAddress: string;
  commUniqueNo?: string | null;
  ownerName?: string | null;
}): Promise<TilkoCaseStatusResult> {
  const { commUniqueNo, ownerName } = params;
  if (!commUniqueNo || !ownerName) {
    throw new Error("Tilko 등기신청사건 조회에는 부동산 고유번호와 소유자명이 필요합니다.");
  }

  const cacheKey = APICache.makeKey("tilko-reg-case", commUniqueNo, ownerName);
  const cached = apiCache.get<TilkoCaseStatusResult>(cacheKey);
  if (cached) return cached;

  const config = getTilkoConfig();
  const aesKey = crypto.randomBytes(16);
  const encKey = encryptAesKey(config.publicKey, aesKey);
  const res = await fetch(`${config.baseUrl}${config.caseStatusPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": config.apiKey,
      "ENC-KEY": encKey,
    },
    body: JSON.stringify({
      Auth: {
        UserId: encryptForTilko(aesKey, config.irosId),
        UserPassword: encryptForTilko(aesKey, config.irosPassword),
      },
      Pin: encryptForTilko(aesKey, commUniqueNo.replace(/-/g, "")),
      A103Name: encryptForTilko(aesKey, ownerName.trim()),
      RealClsCd: "3",
      NameType: "2",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tilko 등기신청사건 조회 실패 (${res.status}): ${errText}`);
  }

  const rawData = (await res.json()) as Record<string, unknown>;
  const result = normalizeCaseStatus(rawData);
  apiCache.set(cacheKey, result, CASE_STATUS_CACHE_TTL);
  return result;
}

function encryptForTilko(aesKey: Buffer, plaintext: string): string {
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv("aes-128-cbc", aesKey, iv);
  return Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]).toString("base64");
}

function encryptAesKey(publicKeyBase64: string, aesKey: Buffer): string {
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyBase64.replace(/\s/g, ""), "base64"),
    format: "der",
    type: "spki",
  });
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    aesKey
  ).toString("base64");
}

export function shouldConfirmWithCodef(result: TilkoCaseStatusResult): boolean {
  return result.hasSignal && result.phase === "completed";
}

function normalizeCaseStatus(rawData: Record<string, unknown>): TilkoCaseStatusResult {
  const candidates = [
    rawData.data,
    rawData.result,
    rawData.results,
    rawData.cases,
    rawData.caseList,
    rawData.ResultList,
    rawData.resList,
  ];

  const rows = candidates.flatMap(toArray).filter(isRecord);
  const cases = rows.length > 0 ? rows.map(toCase) : inferSingleCase(rawData);
  const activeCases = cases.filter((item) => item.status || item.purpose || item.receiptNo);
  const phase = inferPhase(activeCases);
  const hasSignal = activeCases.length > 0 && phase !== "none";

  return {
    hasSignal,
    phase,
    summary: buildSummary(activeCases, phase),
    cases: activeCases,
    rawData,
  };
}

function inferSingleCase(rawData: Record<string, unknown>): TilkoRegistryCase[] {
  const item = toCase(rawData);
  return item.status || item.purpose || item.receiptNo ? [item] : [];
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toCase(item: Record<string, unknown>): TilkoRegistryCase {
  return {
    receiptNo: pickString(item, ["receiptNo", "resReceiptNo", "acceptNo", "resAcceptNo", "caseNo"]),
    receiptDate: pickString(item, ["receiptDate", "resReceiptDate", "acceptDate", "resAcceptDate", "JeobsuIlja"]),
    status: pickString(item, ["status", "resStatus", "processStatus", "resProcessStatus", "state", "CheoliSangtae"]),
    purpose: pickString(item, ["purpose", "resPurpose", "registrationPurpose", "resRegistrationPurpose", "eventName", "DeunggiMogjeog"]),
    applicant: pickString(item, ["applicant", "resApplicant", "name", "resName"]),
    raw: item,
  };
}

function pickString(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function inferPhase(cases: TilkoRegistryCase[]): TilkoCasePhase {
  if (cases.length === 0) return "none";

  const text = cases
    .map((item) => [item.status, item.purpose].filter(Boolean).join(" "))
    .join(" ");

  if (/취하|각하|기각|반려|불수리|말소\s*신청\s*취소/.test(text)) return "dismissed";
  if (/완료|처리완료|등기완료|종결|교합/.test(text)) return "completed";
  if (/처리중|심사|조사|보정|진행/.test(text)) return "in_progress";
  if (/접수|신청|수리/.test(text)) return "received";
  return "unknown";
}

function buildSummary(cases: TilkoRegistryCase[], phase: TilkoCasePhase): string {
  if (cases.length === 0) return "등기신청 사건 없음";

  const phaseLabel: Record<TilkoCasePhase, string> = {
    none: "없음",
    received: "접수",
    in_progress: "처리 중",
    completed: "처리 완료",
    dismissed: "취하/각하",
    unknown: "상태 확인 필요",
  };
  const first = cases[0];
  const purpose = first.purpose ? ` - ${first.purpose}` : "";
  const count = cases.length > 1 ? ` 외 ${cases.length - 1}건` : "";
  return `등기신청 사건 ${phaseLabel[phase]} 감지${purpose}${count}`;
}

// ─── 등기부등본 발급 ───

export interface TilkoRegistryDocResult {
  text: string;
  address: string;
  rawData: Record<string, unknown>;
  source: "tilko";
  commUniqueNo?: string;
}

// 등기부 텍스트에서 부동산 고유번호 파싱 (예: 1234-2024-012345)
export function extractCommUniqueNoFromText(text: string): string | null {
  const match = text.match(/고유번호[\s:：]+(\d{4}-\d{4}-\d{6})/);
  return match ? match[1] : null;
}

function getTilkoRegistryDocConfig() {
  const apiKey = process.env.TILKO_REGISTRY_DOC_API_KEY || process.env.TILKO_API_KEY;
  const publicKey = process.env.TILKO_REGISTRY_DOC_PUBLIC_KEY || process.env.TILKO_PUBLIC_KEY;
  const irosId = process.env.TILKO_IROS_ID;
  const irosPassword = process.env.TILKO_IROS_PASSWORD;
  const docPath = process.env.TILKO_REGISTRY_DOC_PATH || DEFAULT_REGISTRY_DOC_PATH;

  if (!apiKey || !publicKey || !irosId || !irosPassword) {
    throw new Error(
      "Tilko 등기부등본 API 설정이 없습니다. (TILKO_REGISTRY_DOC_API_KEY, TILKO_REGISTRY_DOC_PUBLIC_KEY, TILKO_IROS_ID, TILKO_IROS_PASSWORD)"
    );
  }

  return {
    apiKey,
    publicKey,
    irosId,
    irosPassword,
    baseUrl: process.env.TILKO_API_BASE || DEFAULT_TILKO_BASE,
    docPath,
  };
}

export function isTilkoRegistryDocAvailable(): boolean {
  return !!(
    (process.env.TILKO_REGISTRY_DOC_API_KEY || process.env.TILKO_API_KEY) &&
    (process.env.TILKO_REGISTRY_DOC_PUBLIC_KEY || process.env.TILKO_PUBLIC_KEY) &&
    process.env.TILKO_IROS_ID &&
    process.env.TILKO_IROS_PASSWORD
  );
}

export async function fetchRegistryDocumentByAddress(params: {
  address: string;
  realClsCd?: string;
  registryGubun?: string;
}): Promise<TilkoRegistryDocResult> {
  const { address, realClsCd = "3", registryGubun = "1" } = params;

  const cacheKey = APICache.makeKey("tilko-reg-doc", address, realClsCd, registryGubun);
  const cached = apiCache.get<TilkoRegistryDocResult>(cacheKey);
  if (cached) return cached;

  const config = getTilkoRegistryDocConfig();
  const aesKey = crypto.randomBytes(16);
  const encKey = encryptAesKey(config.publicKey, aesKey);

  const res = await fetch(`${config.baseUrl}${config.docPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": config.apiKey,
      "ENC-KEY": encKey,
    },
    body: JSON.stringify({
      Auth: {
        UserId: encryptForTilko(aesKey, config.irosId),
        UserPassword: encryptForTilko(aesKey, config.irosPassword),
      },
      Address: encryptForTilko(aesKey, address),
      RealClsCd: realClsCd,
      RegistryGubun: registryGubun,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tilko 등기부등본 조회 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const rawData = (await res.json()) as Record<string, unknown>;

  // API 레벨 오류 처리
  const errCode = rawData.errCode ?? rawData.error_code ?? rawData.resultCode ?? rawData.code;
  if (errCode !== undefined && errCode !== "0000" && errCode !== "00" && errCode !== 0 && errCode !== "0") {
    const errMsg = rawData.errMessage ?? rawData.error_message ?? rawData.resultMessage ?? rawData.message ?? "등기부 조회 실패";
    throw new Error(`Tilko API 오류 (${errCode}): ${errMsg}`);
  }

  console.log("[Tilko 등기부등본] rawData keys:", Object.keys(rawData));

  const text = extractTilkoRegistryText(rawData, address);
  const commUniqueNo = extractCommUniqueNoFromText(text) ?? undefined;
  const result: TilkoRegistryDocResult = { text, address, rawData, source: "tilko", commUniqueNo };
  apiCache.set(cacheKey, result, REGISTRY_DOC_CACHE_TTL);
  return result;
}

function extractTilkoRegistryText(raw: Record<string, unknown>, fallbackAddress: string): string {
  // 1. raw 텍스트/HTML 필드 우선 확인
  const rawContent = raw.resContent ?? raw.content ?? raw.htmlContent ?? raw.textContent ?? raw.registryContent ?? raw.resRegistryContent;
  if (typeof rawContent === "string" && rawContent.length > 50) {
    return rawContent
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|tr|li|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }

  // 2. 구조화 JSON 처리
  const data = (isRecord(raw.data) ? raw.data : isRecord(raw.result) ? raw.result : isRecord(raw.resBody) ? raw.resBody : raw) as Record<string, unknown>;
  const lines: string[] = [];

  lines.push("【 표 제 부 】", "");
  const addr = String(data.resAddress ?? data.address ?? data.reqAddress ?? fallbackAddress);
  lines.push(`소재지번: ${addr}`);

  if (data.resBuildingName ?? data.buildingName) lines.push(`건물명칭: ${String(data.resBuildingName ?? data.buildingName)}`);
  if (data.resExclusiveArea ?? data.exclusiveArea) lines.push(`전용면적: ${String(data.resExclusiveArea ?? data.exclusiveArea)}㎡`);
  if (data.resTotalArea ?? data.totalArea) lines.push(`연면적: ${String(data.resTotalArea ?? data.totalArea)}㎡`);
  if (data.resPurpose ?? data.purpose) lines.push(`주용도: ${String(data.resPurpose ?? data.purpose)}`);
  if (data.resStructure ?? data.structure) lines.push(`구조: ${String(data.resStructure ?? data.structure)}`);
  if (data.resBuildYear ?? data.buildYear) lines.push(`건축년도: ${String(data.resBuildYear ?? data.buildYear)}년`);

  // 갑구
  const gapguRaw = data.resGapgu ?? data.gapgu ?? data.ownershipList ?? data.ownership;
  const gapguList = Array.isArray(gapguRaw) ? gapguRaw : gapguRaw ? [gapguRaw] : [];
  lines.push("", "【 갑 구 】 (소유권에 관한 사항)");
  lines.push("──────────────────────────────────");
  if (gapguList.length > 0) {
    for (const entry of gapguList) {
      if (typeof entry === "string") { lines.push(entry); continue; }
      if (!isRecord(entry)) continue;
      const parts: string[] = [];
      const seq = entry.resSeq ?? entry.seq ?? entry.순위번호;
      const purpose = entry.resPurpose ?? entry.purpose ?? entry.등기목적;
      const date = entry.resDate ?? entry.date ?? entry.접수일자;
      const owner = entry.resOwnerName ?? entry.ownerName ?? entry.name ?? entry.소유자;
      const amount = entry.resAmount ?? entry.amount ?? entry.금액;
      if (seq) parts.push(`순위번호: ${seq}`);
      if (purpose) parts.push(`등기목적: ${purpose}`);
      if (date) parts.push(`접수일자: ${date}`);
      if (owner) parts.push(`소유자: ${owner}`);
      if (amount) parts.push(`금액: ${amount}`);
      if (parts.length) lines.push(parts.join(" / "));
    }
  } else {
    lines.push("※ 갑구 정보 없음");
  }

  // 을구
  const eulguRaw = data.resEulgu ?? data.eulgu ?? data.otherRightsList ?? data.mortgageList;
  const eulguList = Array.isArray(eulguRaw) ? eulguRaw : eulguRaw ? [eulguRaw] : [];
  lines.push("", "【 을 구 】 (소유권 이외의 권리에 관한 사항)");
  lines.push("──────────────────────────────────");
  if (eulguList.length > 0) {
    for (const entry of eulguList) {
      if (typeof entry === "string") { lines.push(entry); continue; }
      if (!isRecord(entry)) continue;
      const parts: string[] = [];
      const seq = entry.resSeq ?? entry.seq ?? entry.순위번호;
      const purpose = entry.resPurpose ?? entry.purpose ?? entry.등기목적;
      const date = entry.resDate ?? entry.date ?? entry.접수일자;
      const creditor = entry.resCreditor ?? entry.creditor ?? entry.채권자;
      const amount = entry.resAmount ?? entry.amount ?? entry.resBondAmount ?? entry.채권액;
      const debtor = entry.resDebtorName ?? entry.debtorName ?? entry.채무자;
      if (seq) parts.push(`순위번호: ${seq}`);
      if (purpose) parts.push(`등기목적: ${purpose}`);
      if (date) parts.push(`접수일자: ${date}`);
      if (creditor) parts.push(`채권자: ${creditor}`);
      if (amount) parts.push(`채권액: ${amount}`);
      if (debtor) parts.push(`채무자: ${debtor}`);
      if (parts.length) lines.push(parts.join(" / "));
    }
  } else {
    lines.push("※ 을구 정보 없음");
  }

  return lines.join("\n");
}
