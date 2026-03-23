/**
 * 뉴스·정책 키워드 분류 엔진
 * ────────────────────────────
 * RSS 수집된 기사의 제목+요약을 정규식 매칭하여
 * 태그, 정책 유형, 알림 여부를 판정한다.
 * LLM 미사용 — 추가 비용 $0.
 */

/** 일반 태그 분류 규칙 */
const TAG_RULES: Record<string, RegExp> = {
  취득세: /취득세/,
  양도세: /양도세|양도소득세/,
  종부세: /종합부동산세|종부세/,
  전세: /전세|임차|임대차|보증금/,
  재건축: /재건축|재개발|정비사업/,
  분양: /분양|청약|당첨/,
  대출: /LTV|DTI|DSR|대출|총부채/i,
  규제: /투기과열|조정대상|규제지역|비규제/,
  공급: /공급.*대책|택지|신도시|공공분양/,
  금리: /기준금리|금리.*인상|금리.*인하/,
};

/** 정책 변경 알림 규칙 (isAlert=true 판정) */
const POLICY_ALERT_RULES: Record<string, RegExp> = {
  세율변경: /취득세율|양도세율|종부세율|세율.*(인상|인하|변경)|세제.*개편/,
  규제지역: /투기과열지구.*(지정|해제)|조정대상지역.*(지정|해제)/,
  대출규제: /LTV.*(변경|조정)|DSR.*(완화|강화)|대출.*규제.*(강화|완화)/i,
  전세대책: /전세사기.*대책|임대차보호법.*개정|전세보증.*의무/,
};

export interface ClassifyResult {
  tags: string[];
  policyType: string | null;
  isAlert: boolean;
}

/**
 * 기사 제목+요약을 분석하여 태그·정책유형·알림여부 결정
 */
export function classifyArticle(title: string, summary: string): ClassifyResult {
  const text = `${title} ${summary}`;
  const tags: string[] = [];

  for (const [tag, regex] of Object.entries(TAG_RULES)) {
    if (regex.test(text)) {
      tags.push(tag);
    }
  }

  let policyType: string | null = null;
  let isAlert = false;

  for (const [type, regex] of Object.entries(POLICY_ALERT_RULES)) {
    if (regex.test(text)) {
      policyType = type;
      isAlert = true;
      break;
    }
  }

  return { tags, policyType, isAlert };
}
