/**
 * 계약서 이미지 통합 분석 (OCR + 이미지 무결성 신호)
 *
 * 계약서 사진/스캔 이미지(JPG/PNG)를 단일 Vision 호출로 처리하여
 *   (1) 계약서 전체 텍스트를 추출하고
 *   (2) 이미지에서만 확인 가능한 무결성 신호(서명·날인 유무, 수기 정정,
 *       미기재 공란, 판독 불가 영역)를 판별한다.
 *
 * 텍스트 전용 파이프라인(등기부 OCR)과 분리하여 계약서에 특화한다.
 *
 * @module lib/contract-image
 */

import { getOpenAIClient, OPENAI_MODEL, REASONING_ANALYTICAL } from "@/lib/openai";
import { CONTRACT_IMAGE_PROMPT } from "@/lib/prompts";
import { normalizeRegistryText } from "@/lib/pdf-parser";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export type PresenceState = "present" | "absent" | "unclear";

/** 계약서 이미지에서만 확인 가능한 무결성 신호 */
export interface ContractImageIntegrity {
  /** 이미지 기반 판별 수행 여부 (false면 신호 미표시) */
  available: boolean;
  /** 당사자별 서명 유무 */
  signaturePresent: { landlord: PresenceState; tenant: PresenceState };
  /** 당사자별 날인(도장) 유무 */
  sealPresent: { landlord: PresenceState; tenant: PresenceState };
  /** 손글씨 정정·가필 흔적 */
  handwrittenEdits: boolean;
  handwrittenEditNote?: string;
  /** 미기재(공란)인 핵심 항목명 */
  blankFields: string[];
  /** 판독 불가·훼손 영역 존재 */
  illegibleAreas: boolean;
  illegibleNote?: string;
  /** 사용자 표시용 주의 문구 */
  warnings: string[];
}

export interface ContractImageResult {
  text: string;
  integrity: ContractImageIntegrity;
}

/** 판별 실패/미수행 시의 기본 무결성 객체 */
export function emptyIntegrity(available = false): ContractImageIntegrity {
  return {
    available,
    signaturePresent: { landlord: "unclear", tenant: "unclear" },
    sealPresent: { landlord: "unclear", tenant: "unclear" },
    handwrittenEdits: false,
    blankFields: [],
    illegibleAreas: false,
    warnings: [],
  };
}

function asPresence(v: unknown): PresenceState {
  return v === "present" || v === "absent" ? v : "unclear";
}

function cleanStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function cleanStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, 20);
}

/** 모델이 반환한 raw JSON을 방어적으로 타입에 맞게 정규화 */
export function coerceIntegrity(raw: unknown): ContractImageIntegrity {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sp = (r.signaturePresent && typeof r.signaturePresent === "object"
    ? r.signaturePresent
    : {}) as Record<string, unknown>;
  const se = (r.sealPresent && typeof r.sealPresent === "object"
    ? r.sealPresent
    : {}) as Record<string, unknown>;

  return {
    available: true,
    signaturePresent: {
      landlord: asPresence(sp.landlord),
      tenant: asPresence(sp.tenant),
    },
    sealPresent: {
      landlord: asPresence(se.landlord),
      tenant: asPresence(se.tenant),
    },
    handwrittenEdits: !!r.handwrittenEdits,
    handwrittenEditNote: cleanStr(r.handwrittenEditNote),
    blankFields: cleanStrArray(r.blankFields),
    illegibleAreas: !!r.illegibleAreas,
    illegibleNote: cleanStr(r.illegibleNote),
    warnings: cleanStrArray(r.warnings),
  };
}

/**
 * 계약서 이미지 → { 텍스트, 무결성 신호 }
 * 단일 Vision 호출(gpt-5-mini)로 OCR과 무결성 판별을 동시에 수행한다.
 */
export async function analyzeContractImage(
  images: { buffer: Buffer; mimeType: string }[]
): Promise<ContractImageResult> {
  const openai = getOpenAIClient();

  const imageContents = images.map((img) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${img.mimeType};base64,${img.buffer.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  let lastText = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: CONTRACT_IMAGE_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "이 부동산 계약서 이미지를 분석하세요." },
              ...imageContents,
            ],
          },
        ],
        reasoning_effort: REASONING_ANALYTICAL,
        max_completion_tokens: 16384,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content?.trim() || "";
      if (!content) {
        console.warn(`[계약서 이미지] 시도 ${attempt}/${MAX_RETRIES}: 빈 응답`);
      } else {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const rawText = typeof parsed.text === "string" ? parsed.text.trim() : "";
        if (rawText.length >= 20) {
          // 등기부용이 아닌 범용 공백/페이지마커 정리(계약서 텍스트 무손상)
          const text = normalizeRegistryText(rawText);
          return { text, integrity: coerceIntegrity(parsed.integrity) };
        }
        lastText = rawText;
        console.warn(
          `[계약서 이미지] 시도 ${attempt}/${MAX_RETRIES}: 추출 텍스트 부족 (${rawText.length}자)`
        );
      }
    } catch (error) {
      console.warn(`[계약서 이미지] 시도 ${attempt}/${MAX_RETRIES} 실패:`, error);
      if (attempt === MAX_RETRIES) throw error;
    }

    await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
  }

  if (lastText.length >= 20) {
    return { text: normalizeRegistryText(lastText), integrity: emptyIntegrity(false) };
  }
  throw new Error(
    "계약서 이미지에서 텍스트를 추출할 수 없습니다. 선명한 계약서 이미지를 업로드해주세요."
  );
}
