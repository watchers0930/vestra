import { describe, expect, it } from "vitest";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { parseTitle } from "@/lib/registry/title-parser";
import { parseTitleArea, parseAreaValue } from "@/lib/registry/title-area-parser";
import { parseTitleAddress, normalizePropertyAddress } from "@/lib/registry/title-address-parser";
import { normalizeRecord, compareRecords, sameProperty } from "@/lib/analysis/normalize-record";
import { checklistInputSchema } from "@/schemas/jeonse-checklist";
import { analysisInputSchema } from "@/schemas/analyze-unified";
import { readChecklistBody, ChecklistBodyError } from "@/lib/jeonse/checklist-http";
const fixture = (claim: number) => parseRegistry(`【 표 제 부 】\n서울특별시 강남구 테헤란로 123\n아파트 84.97㎡\n【 갑 구 】\n1 소유권보존 2020년1월1일 소유자 홍길동\n【 을 구 】\n1 근저당권설정 2021년1월1일 채권최고액 금${claim}원 근저당권자 은행`);
describe("선순위 정책 계약", () => {
  it.each([[0,0],[59.99,0],[60,15],[70,30],[80,45],[84.99,45],[85,51],[85.01,51],[100,71],[120,71]])("%s%% 감점은 %s 이상", (ratio, deduction) => {
    const s = calculateRiskScore(fixture(ratio * 10000), 1000000);
    expect(s.totalDeduction).toBeGreaterThanOrEqual(deduction);
    expect(s.factors.reduce((sum, f) => sum + f.deduction, 0)).toBe(s.totalDeduction);
    expect(s.totalScore + (100-s.totalScore)).toBe(100);
    if (ratio >= 85) { expect(s.totalScore).toBeLessThanOrEqual(49); expect(["D","F"]).toContain(s.grade); expect(s.decisiveHighRisk).not.toBeNull(); }
  });
  it("채권 증가·시세 감소·보증금 증가에 따른 단조성", () => {
    const values = [59, 60, 70, 80, 84.99, 85, 85.01, 100, 120];
    for (const input of [values.map(r => calculateRiskScore(fixture(r * 10000), 1000000)),
      [2000000,1500000,1000000,800000,500000].map(v => calculateRiskScore(fixture(850000),v)),
      [500000,800000,1000000,1500000,2000000].map(d => calculateRiskScore(fixture(850000),5000000,d))]) {
      for (let i=1;i<input.length;i++) expect(input[i].totalScore).toBeLessThanOrEqual(input[i-1].totalScore);
    }
  });
  it("보증금 미입력과 0은 분모로 사용하지 않는다", () => {
    expect(calculateRiskScore(fixture(850000),1000000).claimRatios?.userDeposit).toBeNull();
    expect(calculateRiskScore(fixture(850000),1000000,0).claimRatios?.ratioToDeposit).toBeNull();
    expect(calculateRiskScore(fixture(850000),5000000,1000000).decisiveHighRisk).toBeNull();
  });
  it("말소·부기등기는 신규 채권 합산 제외", () => {
    const parsed=fixture(850000);
    parsed.eulgu.push({...parsed.eulgu[0], amount: 999999999, isSupplementary:true});
    parsed.eulgu.push({...parsed.eulgu[0], amount: 999999999, isCancelled:true});
    expect(calculateRiskScore(parsed,1000000).claimRatios?.priorClaims).toBe(850000);
  });
});
describe("표제부 파싱", () => {
  it.each(["84.97㎡","84.97m²","84.97m2","８４ . ９７ 제곱미터","84.\n97\n㎡"])("단위 정규화 %s", input => expect(parseAreaValue(input)).toBe(84.97));
  it("전유부분 우선 및 충돌·결측", () => {
    expect(parseTitleArea("건물전체 1000㎡\n전유부분 제3층 제301호 84.97㎡\n대지권 527㎡").exclusiveArea).toBe("84.97㎡");
    expect(parseTitleArea("전유부분 84.97㎡ 85㎡").area).toBe("");
    expect(parseTitleArea("전유부분 84.97").area).toBe("");
    expect(parseTitleArea("전유부분\n제301호 84.97㎡\n제302호 59.9㎡", "301호").area).toBe("84.97㎡");
  });
  it.each(["서울특별시 강남구 테헤란로 123-4", "세종특별자치시 도움3로 12", "경기도 남양주시 다산동 산 12-3"])("주소 완전표시 %s", a => {
    expect(parseTitleAddress(a+"\n철근콘크리트조\n소유자 서울특별시 송파구 가락동 1").address).toBe(a);
  });
  it("신규 주소 파서가 실패하면 legacy 주소 보존", () => {
    const raw="소재지 서울특별시 강남구 역삼동";
    expect(parseTitleAddress(raw).address).toBe("");
    expect(parseTitle(raw).address).toBe("서울특별시 강남구 역삼동");
    expect(parseTitle("").address).toBe("");
  });
  it("유효한 신규 주소 우선, 다중 호수는 legacy 첫 호수로 복원하지 않음", () => {
    const raw="서울특별시 강남구 역삼동 123-4\n[도로명주소]\n서울특별시 강남구 테헤란로 123\n전유부분 제101동 제3층 제301호 84.97㎡\n제302호 59.9㎡";
    expect(parseTitle(raw).address).toBe("서울특별시 강남구 테헤란로 123");
    expect(parseTitle(raw).unitNumber).toBe("");
  });
  it("다중 행 주소·지번 보존·동호수 분리", () => {
    const result = parseTitleAddress("서울특별시 강남구 역삼동\n123-4\n[도로명주소]\n서울특별시 강남구\n테헤란로\n123-4\n전유부분 제101동 제12층 제1203호 84.97㎡");
    expect(result.address).toBe("서울특별시 강남구 테헤란로 123-4");
    expect(result.lotAddress).toBe("서울특별시 강남구 역삼동 123-4");
    expect(result.unitNumber).toBe("101동 1203호");
    expect(normalizePropertyAddress("  서울\n １０１동 1203호 ")).toBe("서울 101동 1203호");
  });
});
const snapshot = (data: unknown) => ({id:"a",type:"rights",typeLabel:"권리분석",address:"서울 101동 101호",createdAt:new Date("2026-10-21"),data:JSON.stringify(data)});
describe("저장 스냅샷 정규화", () => {
  it("현재 score 우선 및 레거시 폴백", () => {
    expect(normalizeRecord(snapshot({vScore:{score:44, finalScore:80}})).metrics.vScore).toBe(44);
    expect(normalizeRecord(snapshot({vScore:{finalScore:80}})).metrics.vScore).toBe(80);
    expect(normalizeRecord({...snapshot({}),data:"invalid"}).metrics.safetyScore).toBeNull();
  });
  it("점수·비율 차이 및 규칙 버전", () => {
    const old=normalizeRecord(snapshot({riskScore:{totalScore:50,scoreRuleVersion:"v1",claimRatios:{jeonseRatio:74.9},factors:[]}}));
    const current=normalizeRecord(snapshot({riskScore:{totalScore:42,scoreRuleVersion:"v2",claimRatios:{jeonseRatio:78.1},factors:[]}}));
    expect(compareRecords(current,old)).toMatchObject({safetyScore:{delta:-8,direction:"worse"},jeonseRatio:{deltaPp:3.2},ruleVersionChanged:true});
    expect(compareRecords(current,null)).toBeNull();
    expect(sameProperty(snapshot({}), {...snapshot({}),address:"서울 101동 102호"})).toBe(false);
  });
});
describe("서버 입력", () => {
  const valid={address:"서울 101호",schemaVersion:1,expectedRevision:0,state:{"0":true,"14":false}};
  it.each([{state:{"15":true}},{state:{"0":"true"}},{schemaVersion:2},{expectedRevision:-1},{address:" "},{address:"가".repeat(301)}])("잘못된 체크 입력 거절", override=>expect(checklistInputSchema.safeParse({...valid,...override}).success).toBe(false));
  it("사용자/ID/시각 주입 무시", ()=>expect(checklistInputSchema.parse({...valid,userId:"victim",id:"other",updatedAt:"future"})).toEqual(valid));
  it.each([-1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,0.1])("잘못된 보증금 %s 거절", userDeposit=>expect(analysisInputSchema.safeParse({rawText:"x",userDeposit}).success).toBe(false));
  it("분석 원문 60,000자 경계 제한", () => {
    expect(analysisInputSchema.safeParse({rawText:"가".repeat(60000)}).success).toBe(true);
    expect(analysisInputSchema.safeParse({rawText:"가".repeat(60001)}).success).toBe(false);
  });
  it("실제 바이트 기준 16KB·JSON 검증",async()=>{
    await expect(readChecklistBody(new Request("http://localhost",{method:"PUT",body:"가".repeat(6000)}))).rejects.toMatchObject({status:413});
    await expect(readChecklistBody(new Request("http://localhost",{method:"PUT",body:"{"}))).rejects.toBeInstanceOf(ChecklistBodyError);
    expect(await readChecklistBody(new Request("http://localhost",{method:"PUT",body:JSON.stringify(valid)}))).toEqual(valid);
  });
});
