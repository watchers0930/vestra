import { describe, it, expect } from "vitest";
import {
  parseRegistry,
  extractAmount,
  SAMPLE_REGISTRY_TEXT,
} from "@/lib/registry-parser";

describe("parseRegistry", () => {
  const result = parseRegistry(SAMPLE_REGISTRY_TEXT);

  describe("표제부 파싱", () => {
    it("소재지 주소를 추출한다", () => {
      expect(result.title.address).toContain("강남구");
      expect(result.title.address).toContain("역삼동");
    });

    it("면적을 추출한다", () => {
      expect(result.title.area).toBe("84.97㎡");
    });

    it("구조를 추출한다", () => {
      expect(result.title.structure).toContain("철근콘크리트");
    });

    it("용도를 '아파트'로 추출한다", () => {
      expect(result.title.purpose).toBe("아파트");
    });

    it("대지권비율을 추출한다", () => {
      expect(result.title.landRightRatio).toContain("52718.4");
    });
  });

  describe("갑구 파싱", () => {
    it("갑구 항목을 5개 이상 파싱한다", () => {
      expect(result.gapgu.length).toBeGreaterThanOrEqual(5);
    });

    it("1번 항목은 소유권보존이다", () => {
      const first = result.gapgu.find((e) => e.order === 1);
      expect(first?.purpose).toBe("소유권보존");
      expect(first?.riskType).toBe("safe");
    });

    it("소유권이전 항목을 감지한다", () => {
      const transfers = result.gapgu.filter(
        (e) => e.purpose === "소유권이전"
      );
      expect(transfers.length).toBeGreaterThanOrEqual(2);
    });

    it("가압류 항목을 감지한다", () => {
      const seizure = result.gapgu.find((e) => e.purpose === "가압류");
      expect(seizure).toBeDefined();
      expect(seizure?.riskType).toBe("danger");
    });

    it("말소 항목을 감지한다", () => {
      const cancelled = result.gapgu.filter((e) => e.isCancelled);
      expect(cancelled.length).toBeGreaterThan(0);
    });

    it("날짜를 YYYY.MM.DD 형식으로 추출한다", () => {
      const dated = result.gapgu.filter((e) => e.date);
      expect(dated.length).toBeGreaterThan(0);
      for (const entry of dated) {
        expect(entry.date).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
      }
    });
  });

  describe("을구 파싱", () => {
    it("을구 항목을 4개 이상 파싱한다", () => {
      expect(result.eulgu.length).toBeGreaterThanOrEqual(4);
    });

    it("근저당권설정 항목의 금액을 추출한다", () => {
      const mortgage = result.eulgu.find(
        (e) => e.purpose === "근저당권설정" && !e.isCancelled && e.amount > 0
      );
      expect(mortgage).toBeDefined();
      expect(mortgage!.amount).toBeGreaterThan(0);
    });

    it("전세권설정 금액을 추출한다 (5억5천만원)", () => {
      const jeonse = result.eulgu.find((e) => /전세권/.test(e.purpose));
      expect(jeonse).toBeDefined();
      expect(jeonse!.amount).toBe(550000000);
    });

    it("말소된 근저당을 감지한다", () => {
      const cancelled = result.eulgu.filter(
        (e) => e.isCancelled && /근저당/.test(e.purpose)
      );
      expect(cancelled.length).toBeGreaterThan(0);
    });
  });

  describe("요약 통계", () => {
    it("갑구 전체/활성 건수가 정확하다", () => {
      expect(result.summary.totalGapguEntries).toBe(result.gapgu.length);
      const activeCount = result.gapgu.filter((e) => !e.isCancelled).length;
      expect(result.summary.activeGapguEntries).toBe(activeCount);
    });

    it("을구 전체/활성 건수가 정확하다", () => {
      expect(result.summary.totalEulguEntries).toBe(result.eulgu.length);
      const activeCount = result.eulgu.filter((e) => !e.isCancelled).length;
      expect(result.summary.activeEulguEntries).toBe(activeCount);
    });

    it("총채권액 = 근저당합계 + 전세합계", () => {
      expect(result.summary.totalClaimsAmount).toBe(
        result.summary.totalMortgageAmount + result.summary.totalJeonseAmount
      );
    });

    it("소유권이전 횟수가 정확하다", () => {
      const manual = result.gapgu.filter(
        (e) => e.purpose === "소유권이전" && !e.isCancelled
      ).length;
      expect(result.summary.ownershipTransferCount).toBe(manual);
    });
  });

  describe("빈 입력 처리", () => {
    it("빈 텍스트도 에러 없이 처리한다", () => {
      const empty = parseRegistry("");
      expect(empty.gapgu).toHaveLength(0);
      expect(empty.eulgu).toHaveLength(0);
    });

    it("섹션 없는 텍스트도 처리한다", () => {
      const noSections = parseRegistry("아무 내용 없는 텍스트입니다.");
      expect(noSections.gapgu).toHaveLength(0);
      expect(noSections.eulgu).toHaveLength(0);
    });
  });
});

describe("인터넷등기소 실제 형식 — 말소 감지", () => {
  // 인터넷등기소에서 복사/붙여넣기 시 공백 포함 형식
  const irosText = `
【 표 제 부 】 (건물의 표시)
표시번호  접  수  소재지번 및 건물번호  건물내역
1  경기도 광명시 철산동 367 철산한신아파트 제108동 제14층 제1403호 84.94㎡ 아파트
전유부분 건물번호 제14층 제1403호 84.94㎡

【 갑 구 】 (소유권에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자 및 기타사항
1 소유권보존 1992년12월15일 제12345호 1992년12월10일 보존등기 소유자 김ㅇㅇ
2 소유권이전 2003년3월20일 제23456호 2003년3월18일 매매 소유자 이ㅇㅇ
3 소유권이전 2005년7월10일 제34567호 2005년7월8일 매매 소유자 박ㅇㅇ
4 소유권이전 2016년8월15일 제45678호 2016년8월12일 매매 소유자 최ㅇㅇ

【 을 구 】 (소유권 이외의 권리에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자 및 기타사항
1 근저당권설정 2003년3월25일 제23460호 2003년3월20일 설정계약 채권최고액 금 52,000,000원 근저당권자 주식회사국민은행 채무자 이ㅇㅇ
2 1번근저당권말소 2005년7월12일 제34570호 2005년7월10일 해제
3 근저당권설정 2011년1월28일 제3038호 2011년1월27일 설정계약 채권최고액 금 13,000,000원 근저당권자 주식회사국민은행 채무자 박ㅇㅇ
3 3번근저당권말소 2016년10월14일 제14567호 2016년10월13일 해제
4 근저당권설정 2016년8월20일 제45680호 2016년8월18일 설정계약 채권최고액 금 48,000,000원 근저당권자 주식회사하나은행 채무자 최ㅇㅇ
4 4번근저당권말소 2020년3월15일 제5678호 2020년3월14일 해제
`.trim();

  const parsed = parseRegistry(irosText);

  it("을구 항목을 파싱한다", () => {
    expect(parsed.eulgu.length).toBeGreaterThanOrEqual(4);
  });

  it("1번근저당권말소로 1번 항목이 말소 처리된다", () => {
    const entry1 = parsed.eulgu.find(e => e.order === 1 && e.purpose === "근저당권설정");
    expect(entry1).toBeDefined();
    expect(entry1!.isCancelled).toBe(true);
  });

  it("3번근저당권말소로 3번 항목이 말소 처리된다", () => {
    const entry3 = parsed.eulgu.find(e => e.order === 3 && e.purpose === "근저당권설정");
    expect(entry3).toBeDefined();
    expect(entry3!.isCancelled).toBe(true);
  });

  it("4번근저당권말소로 4번 항목이 말소 처리된다", () => {
    const entry4 = parsed.eulgu.find(e => e.order === 4 && e.purpose === "근저당권설정");
    expect(entry4).toBeDefined();
    expect(entry4!.isCancelled).toBe(true);
  });

  it("활성 근저당 금액이 0원이다", () => {
    expect(parsed.summary.totalMortgageAmount).toBe(0);
  });

  it("모든 을구 항목이 말소 상태이다", () => {
    const activeEulgu = parsed.eulgu.filter(e => !e.isCancelled);
    expect(activeEulgu).toHaveLength(0);
  });

  // 공백 포함 형식 테스트: "3번 근저당권 말소"
  const spacedText = `
【 을 구 】 (소유권 이외의 권리에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자 및 기타사항
1 근저당권설정 2011년1월28일 설정계약 채권최고액 금 13,000,000원 근저당권자 국민은행
2 1번 근저당권 말소 2016년10월14일 해제
`.trim();

  it("공백 포함 '1번 근저당권 말소'로 1번이 말소된다", () => {
    const spacedParsed = parseRegistry(spacedText);
    const entry1 = spacedParsed.eulgu.find(e => e.order === 1 && e.purpose === "근저당권설정");
    expect(entry1).toBeDefined();
    expect(entry1!.isCancelled).toBe(true);
  });

  // 줄바꿈 없는 연속 텍스트 (인터넷등기소 복사 시 발생)
  const noNewlineText = `【 을 구 】 (소유권 이외의 권리에 관한 사항) 순위번호 등기목적 접수 등기원인 권리자 및 기타사항 1 근저당권설정 2011년1월28일 제3038호 설정계약 채권최고액 금 13,000,000원 근저당권자 국민은행 채무자 박ㅇㅇ 1번근저당권말소 2016년10월14일 제14567호 해제 2 근저당권설정 2016년8월20일 제45680호 설정계약 채권최고액 금 48,000,000원 근저당권자 하나은행 채무자 최ㅇㅇ 2번근저당권말소 2020년3월15일 제5678호 해제`;

  it("줄바꿈 없는 텍스트에서도 말소를 감지한다", () => {
    const noNLParsed = parseRegistry(noNewlineText);
    const activeMortgage = noNLParsed.eulgu.filter(e => !e.isCancelled && /근저당/.test(e.purpose));
    expect(activeMortgage).toHaveLength(0);
    expect(noNLParsed.summary.totalMortgageAmount).toBe(0);
  });
});

describe("연번 말소 — '3번4번근저당권말소' 형식", () => {
  // 하나의 말소 항목이 여러 순위번호를 참조하는 경우
  const multiRefText = `
【 을 구 】 (소유권 이외의 권리에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자 및 기타사항
1 근저당권설정 2003년3월25일 제23460호 설정계약 채권최고액 금 96,000,000원 근저당권자 국민은행
2 1번근저당권말소 2005년7월12일 제34570호 해제
3 근저당권설정 2011년1월28일 제3038호 설정계약 채권최고액 금 13,000,000원 근저당권자 국민은행
4 근저당권설정 2016년8월20일 제45680호 설정계약 채권최고액 금 48,000,000원 근저당권자 하나은행
5 근저당권설정 2018년3월15일 제5555호 설정계약 채권최고액 금 14,400,000원 근저당권자 신한은행
6 3번4번근저당권말소 2020년5월10일 제6666호 해제
7 5번근저당권말소 2022년1월20일 제7777호 해제
8 근저당권설정 2022년6월1일 제8888호 설정계약 채권최고액 금 48,000,000원 근저당권자 우리은행
8 8번근저당권말소 2024년3월15일 제9999호 해제
`.trim();

  const parsed = parseRegistry(multiRefText);

  it("을구 항목을 파싱한다", () => {
    expect(parsed.eulgu.length).toBeGreaterThanOrEqual(5);
  });

  it("1번근저당권말소로 1번이 말소된다", () => {
    const entry1 = parsed.eulgu.find(e => e.order === 1 && e.purpose === "근저당권설정");
    expect(entry1).toBeDefined();
    expect(entry1!.isCancelled).toBe(true);
  });

  it("3번4번근저당권말소로 3번이 말소된다", () => {
    const entry3 = parsed.eulgu.find(e => e.order === 3 && e.purpose === "근저당권설정");
    expect(entry3).toBeDefined();
    expect(entry3!.isCancelled).toBe(true);
  });

  it("3번4번근저당권말소로 4번이 말소된다", () => {
    const entry4 = parsed.eulgu.find(e => e.order === 4 && e.purpose === "근저당권설정");
    expect(entry4).toBeDefined();
    expect(entry4!.isCancelled).toBe(true);
  });

  it("5번근저당권말소로 5번이 말소된다", () => {
    const entry5 = parsed.eulgu.find(e => e.order === 5 && e.purpose === "근저당권설정");
    expect(entry5).toBeDefined();
    expect(entry5!.isCancelled).toBe(true);
  });

  it("같은 순위번호 8번근저당권말소로 8번이 말소된다", () => {
    const entry8 = parsed.eulgu.find(e => e.order === 8 && e.purpose === "근저당권설정");
    expect(entry8).toBeDefined();
    expect(entry8!.isCancelled).toBe(true);
  });

  it("활성 근저당 금액이 0원이다", () => {
    expect(parsed.summary.totalMortgageAmount).toBe(0);
  });

  // 쉼표 구분: "3번,4번 근저당권 말소"
  const commaRefText = `
【 을 구 】 (소유권 이외의 권리에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자 및 기타사항
1 근저당권설정 2011년1월28일 설정계약 채권최고액 금 13,000,000원 근저당권자 국민은행
2 근저당권설정 2016년8월20일 설정계약 채권최고액 금 48,000,000원 근저당권자 하나은행
3 1번,2번 근저당권 말소 2020년5월10일 해제
`.trim();

  it("쉼표 구분 '1번,2번 근저당권 말소'로 1번과 2번 모두 말소된다", () => {
    const commaParsed = parseRegistry(commaRefText);
    const entry1 = commaParsed.eulgu.find(e => e.order === 1 && e.purpose === "근저당권설정");
    const entry2 = commaParsed.eulgu.find(e => e.order === 2 && e.purpose === "근저당권설정");
    expect(entry1!.isCancelled).toBe(true);
    expect(entry2!.isCancelled).toBe(true);
    expect(commaParsed.summary.totalMortgageAmount).toBe(0);
  });

  // 줄바꿈 없는 연속 텍스트에서 연번 말소
  const noNLMultiRef = `【 을 구 】 (소유권 이외의 권리에 관한 사항) 순위번호 등기목적 접수 등기원인 권리자 및 기타사항 1 근저당권설정 2011년1월28일 설정계약 채권최고액 금 13,000,000원 근저당권자 국민은행 2 근저당권설정 2016년8월20일 설정계약 채권최고액 금 48,000,000원 근저당권자 하나은행 3 1번2번근저당권말소 2020년5월10일 해제`;

  it("줄바꿈 없는 텍스트에서 1번2번근저당권말소로 양쪽 모두 말소된다", () => {
    const noNLParsed = parseRegistry(noNLMultiRef);
    const activeMortgage = noNLParsed.eulgu.filter(e => !e.isCancelled && /근저당/.test(e.purpose));
    expect(activeMortgage).toHaveLength(0);
    expect(noNLParsed.summary.totalMortgageAmount).toBe(0);
  });
});

describe("기말소 형식 — 'N번근저당권설정 기말소' 형식 (인터넷등기소 실제)", () => {
  // 실제 인터넷등기소에서 나오는 "기말소" 형식
  // "N번근저당권설정 YYYY년MM월DD일 YYYY년MM월DD일 기말소 제XXXXX호 해지"
  const giMalsoText = `
【 을 구 】 ( 소유권 이외의 권리에 관한 사항 )
순위번호 등 기 목 적 접 수 등 기 원 인 권리자 및 기타사항
1 근저당권설정 2002년10월7일 2002년10월7일 채권최고액 금96,000,000원 제73043호 설정계약 채무자 조ㅇㅇ 근저당권자 주식회사조흥은행 （ 광화문지점 ） 2 1번근저당권설정 2004년3월16일 2004년3월11일 기말소 제12650호 해지
3 근저당권설정 2004년11월26일 2004년11월26일 채권최고액 금13,000,000원 제55906호 설정계약 채무자 신ㅇㅇ 근저당권자 주식회사국민은행 （ 철산지점 ）
4 근저당권설정 2008년4월10일 2008년4월10일 채권최고액 금48,000,000원 제20388호 설정계약 채무자 신ㅇㅇ 근저당권자 주식회사국민은행 （ 철산지점 ）
5 근저당권설정 2012년5월14일 2012년5월14일 채권최고액 금14,400,000원 제16275호 설정계약 채무자 신ㅇㅇ 근저당권자 주식회사국민은행
5 3번근저당권설정 2012년5월14일 2012년5월10일 기말소 제16274호 해지
5 4번근저당권설정 2012년5월14일 2012년5월10일 기말소 제16274호 해지
6 5번근저당권설정 2018년9월11일 2018년9월10일 기말소 제33056호 해지
7 근저당권설정 2014년7월11일 2014년7월11일 채권최고액 금48,000,000원 제25347호 설정계약 채무자 신ㅇㅇ 근저당권자 농협은행주식회사
7 7번근저당권설정 2020년3월15일 2020년3월14일 기말소 제5678호 해지
`.trim();

  const parsed = parseRegistry(giMalsoText);

  it("1번근저당권설정 기말소로 1번이 말소된다", () => {
    const entry1 = parsed.eulgu.find(e => e.order === 1 && e.purpose === "근저당권설정" && e.amount > 0);
    expect(entry1).toBeDefined();
    expect(entry1!.isCancelled).toBe(true);
  });

  it("3번근저당권설정 기말소로 3번이 말소된다 (2자리 월일 날짜)", () => {
    const entry3 = parsed.eulgu.find(e => e.order === 3 && e.purpose === "근저당권설정");
    expect(entry3).toBeDefined();
    expect(entry3!.isCancelled).toBe(true);
  });

  it("4번근저당권설정 기말소로 4번이 말소된다", () => {
    const entry4 = parsed.eulgu.find(e => e.order === 4 && e.purpose === "근저당권설정");
    expect(entry4).toBeDefined();
    expect(entry4!.isCancelled).toBe(true);
  });

  it("5번근저당권설정 기말소로 5번이 말소된다", () => {
    const entry5 = parsed.eulgu.find(e => e.order === 5 && e.purpose === "근저당권설정" && e.amount > 0);
    expect(entry5).toBeDefined();
    expect(entry5!.isCancelled).toBe(true);
  });

  it("7번근저당권설정 기말소로 7번이 말소된다 (같은 순위번호)", () => {
    const entry7 = parsed.eulgu.find(e => e.order === 7 && e.purpose === "근저당권설정" && e.amount > 0);
    expect(entry7).toBeDefined();
    expect(entry7!.isCancelled).toBe(true);
  });

  it("활성 근저당 금액이 0원이다", () => {
    expect(parsed.summary.totalMortgageAmount).toBe(0);
  });
});

describe("extractAmount", () => {
  it("금 480,000,000원 → 480000000", () => {
    expect(extractAmount("채권최고액 금 480,000,000원")).toBe(480000000);
  });

  it("금3억5,000만원 → 350000000", () => {
    expect(extractAmount("금3억5,000만원")).toBe(350000000);
  });

  it("금3억원 → 300000000", () => {
    expect(extractAmount("금3억원")).toBe(300000000);
  });

  it("금5,000만원 → 50000000", () => {
    expect(extractAmount("금5,000만원")).toBe(50000000);
  });

  it("금 550,000,000원 → 550000000", () => {
    expect(extractAmount("전세금 금 550,000,000원")).toBe(550000000);
  });

  it("빈 문자열 → 0", () => {
    expect(extractAmount("")).toBe(0);
  });

  it("금액 없는 텍스트 → 0", () => {
    expect(extractAmount("소유권이전 매매")).toBe(0);
  });
});
