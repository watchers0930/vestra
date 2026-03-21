/**
 * 다중 문서 컨텍스트 병합기
 *
 * 여러 파일에서 추출된 데이터를 하나의 사업 모델(MergedProjectContext)로 병합하고,
 * 문서 간 수치 불일치(DataConflict)를 감지합니다.
 *
 * @module lib/feasibility/context-merger
 */

import type {
  ParsedDocument,
  ExtractedValue,
  DataConflict,
  MergedProjectContext,
} from "./feasibility-types";
// ---------------------------------------------------------------------------
// 불일치 감지 임계값
// ---------------------------------------------------------------------------

/** 동일 키의 값이 이 비율(2%) 이상 차이나면 불일치로 판정 */
const CONFLICT_THRESHOLD = 0.02;

// ---------------------------------------------------------------------------
// 주소 추출
// ---------------------------------------------------------------------------

const ADDRESS_PATTERNS = [
  /(?:소재지|위치|사업지|주소)[:\s]*([가-힣]+(?:시|도)\s*[가-힣]+(?:구|군|시)\s*[가-힣]+(?:동|읍|면|리)[^,\n]*)/,
  /([가-힣]+(?:시|도)\s*[가-힣]+(?:구|군|시)\s*[가-힣]+(?:동|읍|면|리)\s*[0-9\-]+)/,
];

function extractAddress(docs: ParsedDocument[]): {
  address: string;
  district: string;
  dongCode: string;
} {
  for (const doc of docs) {
    for (const pattern of ADDRESS_PATTERNS) {
      const match = doc.rawText.match(pattern);
      if (match && match[1]) {
        const address = match[1].trim();
        // 시군구 추출
        const districtMatch = address.match(/([가-힣]+(?:구|군|시))/);
        return {
          address,
          district: districtMatch?.[1] || "",
          dongCode: "", // 실제 API 연동 시 법정동코드 조회
        };
      }
    }
  }

  return { address: "", district: "", dongCode: "" };
}

// ---------------------------------------------------------------------------
// 프로젝트명 추출
// ---------------------------------------------------------------------------

const PROJECT_NAME_PATTERNS = [
  /(울산\s+우정동\s+주상복합\s+신축사업(?:\([^)]+\))?)/,
  /(?:사업명|프로젝트명|단지명|건물명)[:\s]*([^\n]+)/,
  /(?:가칭|가명)[:\s]*([^\n]+)/,
];

function extractProjectName(docs: ParsedDocument[]): string {
  for (const doc of docs) {
    for (const pattern of PROJECT_NAME_PATTERNS) {
      const match = doc.rawText.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim().replace(/\s+/g, " ");
        if (value.length >= 4 && value.length <= 100) {
          return value;
        }
      }
    }
  }
  // 프로젝트명 미발견 시 첫 번째 파일명 사용
  return docs[0]?.filename.replace(/\.[^.]+$/, "") || "미지정 사업";
}

// ---------------------------------------------------------------------------
// 용도 추출
// ---------------------------------------------------------------------------

type Purpose = MergedProjectContext["purpose"];

const PURPOSE_KEYWORDS: Record<Purpose, string[]> = {
  아파트: ["아파트", "APT", "공동주택"],
  오피스텔: ["오피스텔", "주거형 오피스텔"],
  상가: ["상가", "상업시설", "근린생활시설", "리테일"],
  지식산업센터: ["지식산업센터", "지산센터", "아파트형공장"],
  복합: ["복합", "주상복합", "복합개발"],
  기타: [],
};

function extractPurpose(docs: ParsedDocument[]): Purpose {
  const allText = docs.map((d) => d.rawText).join(" ");

  for (const [purpose, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
    for (const kw of keywords) {
      if (allText.includes(kw)) return purpose as Purpose;
    }
  }

  return "기타";
}

// ---------------------------------------------------------------------------
// 괴리율 계산
// ---------------------------------------------------------------------------

function calculateDeviation(values: ExtractedValue[]): number {
  if (values.length < 2) return 0;

  const nums = values.map((v) => v.value);
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const avg = (max + min) / 2;

  if (avg === 0) return 0;
  return (max - min) / avg;
}

// ---------------------------------------------------------------------------
// 메인: 다중 문서 병합 + 불일치 감지
// ---------------------------------------------------------------------------

export function mergeContexts(
  docs: ParsedDocument[]
): { context: MergedProjectContext; conflicts: DataConflict[] } {
  const allClaims = new Map<string, ExtractedValue[]>();
  const conflicts: DataConflict[] = [];

  // 1. 모든 문서의 추출값을 키별로 그룹핑
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc.extractedData)) {
      if (!allClaims.has(key)) allClaims.set(key, []);
      allClaims.get(key)!.push(value);
    }
  }

  // 2. 동일 키에 다른 값이 있으면 conflict 등록
  const mergedClaims: ExtractedValue[] = [];
  for (const [key, values] of allClaims) {
    if (values.length === 1) {
      mergedClaims.push(values[0]);
    } else {
      const deviation = calculateDeviation(values);
      if (deviation > CONFLICT_THRESHOLD) {
        // 모든 값 쌍 비교 (2개 이상 파일에서 같은 키가 나온 경우)
        for (let i = 0; i < values.length - 1; i++) {
          for (let j = i + 1; j < values.length; j++) {
            const pairDev = Math.abs(values[i].value - values[j].value) /
              Math.max(values[i].value, values[j].value, 1);
            if (pairDev > CONFLICT_THRESHOLD) {
              conflicts.push({
                field: key,
                fileA: values[i].sourceFile,
                valueA: values[i].value,
                fileB: values[j].sourceFile,
                valueB: values[j].value,
                deviation: pairDev * 100,
              });
            }
          }
        }
      }
      // 충돌과 무관하게 마지막 문서(최신) 기준으로 채택
      mergedClaims.push(values[values.length - 1]);
    }
  }

  // 3. 사업 컨텍스트 조립
  const getValue = (key: string): number => {
    const claim = mergedClaims.find((c) => c.key === key);
    return claim?.value || 0;
  };

  const location = extractAddress(docs);
  const projectName = extractProjectName(docs);
  const purpose = extractPurpose(docs);

  const context: MergedProjectContext = {
    projectName,
    location,
    scale: {
      totalLandArea: getValue("total_land_area"),
      totalFloorArea: getValue("total_floor_area"),
      floorAreaRatio: getValue("floor_area_ratio"),
      buildingCoverage: getValue("building_coverage"),
      floors: { above: 0, below: 0 }, // 텍스트에서 층수 추출은 추후 보강
      totalUnits: getValue("total_units"),
    },
    purpose,
    claims: mergedClaims,
    conflicts,
    resolvedConflicts: [],
    sourceFiles: docs,
  };

  return { context, conflicts };
}

// ---------------------------------------------------------------------------
// 불일치 해결 적용
// ---------------------------------------------------------------------------

export function applyResolvedConflicts(
  context: MergedProjectContext,
  resolvedConflicts: { field: string; selectedFile: string; selectedValue: number }[]
): MergedProjectContext {
  const updated = { ...context };
  updated.resolvedConflicts = resolvedConflicts;

  // 해결된 값으로 claims 업데이트
  updated.claims = context.claims.map((claim) => {
    const resolved = resolvedConflicts.find((r) => r.field === claim.key);
    if (resolved) {
      return { ...claim, value: resolved.selectedValue, sourceFile: resolved.selectedFile };
    }
    return claim;
  });

  return updated;
}
