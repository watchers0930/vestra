import { describe, expect, it } from "vitest";
import { extractClaimsFromTextForTest } from "@/lib/feasibility/document-parser";

describe("extractClaimsFromTextForTest", () => {
  it("개행과 공백이 섞인 사업성 문구에서 핵심 수치를 추출한다", () => {
    const text = `
      예정 분양가
      3,200 만원
      평당 공사비 820 만원
      예상 분양률
      78%
      목표 수익률 9 %
      PF 조달 금리 9.5%
      연 면적 5,400 ㎡
      대지면적 1,200㎡
      용적률 450%
      건폐율 60 %
      총 세대수 48세대
    `;

    const result = extractClaimsFromTextForTest(text);

    expect(result.planned_sale_price?.value).toBe(3200);
    expect(result.construction_cost_per_pyeong?.value).toBe(820);
    expect(result.expected_sale_rate?.value).toBe(78);
    expect(result.expected_profit_rate?.value).toBe(9);
    expect(result.pf_interest_rate?.value).toBe(9.5);
    expect(result.total_floor_area?.value).toBe(5400);
    expect(result.total_land_area?.value).toBe(1200);
    expect(result.floor_area_ratio?.value).toBe(450);
    expect(result.building_coverage?.value).toBe(60);
    expect(result.total_units?.value).toBe(48);
  });

  it("평 단위 면적과 만원 단위 사업비를 표준 단위로 변환한다", () => {
    const text = `
      대지면적 300평
      연면적 1,500평
      총 사업비 85,000만원
      토지비 32,000만원
    `;

    const result = extractClaimsFromTextForTest(text);

    expect(result.total_land_area?.value).toBeCloseTo(991.74, 2);
    expect(result.total_floor_area?.value).toBeCloseTo(4958.68, 2);
    expect(result.total_project_cost?.value).toBe(8.5);
    expect(result.land_cost?.value).toBe(3.2);
  });

  it("SCR 사업 개요/자금조달 포맷에서 세대수와 비율, PF 금리를 우선 추출한다", () => {
    const text = `
      본 계획사업은 울산광역시 중구 우정동 92-1번지 일원(대지면적 1,998.59평)에
      지하5층~지상45층 2개동(전체 연면적 19,839.53평) 규모로 아파트 316세대, 오피스텔 20실을 신축하여 분양하는 사업임.
      건폐율/용적률 29.26% / 647.68%
      표 6 자금조달 계획 PF대출 자기자본 조달액 이자율 상환/회수 일시 80,000 한도 6.0%(예정)
      표 17 울산시 및 중구, 우정동 인구수 및 세대수 추이 세대수 23,093,108
    `;

    const result = extractClaimsFromTextForTest(text);

    expect(result.total_land_area?.value).toBeCloseTo(6606.91, 2);
    expect(result.total_floor_area?.value).toBeCloseTo(65585.22, 2);
    expect(result.total_units?.value).toBe(336);
    expect(result.building_coverage?.value).toBe(29.26);
    expect(result.floor_area_ratio?.value).toBe(647.68);
    expect(result.pf_interest_rate?.value).toBe(6);
  });

  it("SCR 비율 표기가 줄바꿈으로 분리돼도 건폐율과 용적률을 추출한다", () => {
    const text = `
      건폐율/용적률

      29.26% / 647.68%
    `;

    const result = extractClaimsFromTextForTest(text);

    expect(result.building_coverage?.value).toBe(29.26);
    expect(result.floor_area_ratio?.value).toBe(647.68);
  });

  it("OCR처럼 띄어진 건폐율/용적률 표기도 정규화해서 추출한다", () => {
    const text = "건 폐 율 / 용 적 률 29.26% / 647.68%";

    const result = extractClaimsFromTextForTest(text);

    expect(result.building_coverage?.value).toBe(29.26);
    expect(result.floor_area_ratio?.value).toBe(647.68);
  });

  it("SCR 재무표의 사업비 합계(백만원)를 억원으로 환산한다", () => {
    const text = `
      금융비용 소계 33,837 14.5%
      사업비 합계 217,708 93.0%
      (세전)사업이익 16,360 7.0%
      주: 차주제시안을 기준으로 당사 가공
    `;

    const result = extractClaimsFromTextForTest(text);

    expect(result.total_project_cost?.value).toBe(2177.08);
  });
});
