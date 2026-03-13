/**
 * 등기부등본 50개 랜덤 생성 스크립트
 * 실행: npx tsx scripts/generate-registry-samples.ts
 * 출력: scripts/output/registry-samples/ 디렉토리에 50개 .txt 파일
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// ─── 데이터 풀 ───

const DISTRICTS: { city: string; gu: string; dong: string; road: string }[] = [
  { city: "서울특별시", gu: "강남구", dong: "역삼동", road: "테헤란로" },
  { city: "서울특별시", gu: "강남구", dong: "삼성동", road: "봉은사로" },
  { city: "서울특별시", gu: "서초구", dong: "서초동", road: "서초대로" },
  { city: "서울특별시", gu: "서초구", dong: "반포동", road: "반포대로" },
  { city: "서울특별시", gu: "송파구", dong: "잠실동", road: "올림픽로" },
  { city: "서울특별시", gu: "송파구", dong: "문정동", road: "송파대로" },
  { city: "서울특별시", gu: "마포구", dong: "상암동", road: "월드컵북로" },
  { city: "서울특별시", gu: "마포구", dong: "합정동", road: "양화로" },
  { city: "서울특별시", gu: "용산구", dong: "한남동", road: "이태원로" },
  { city: "서울특별시", gu: "용산구", dong: "이촌동", road: "이촌로" },
  { city: "서울특별시", gu: "영등포구", dong: "여의도동", road: "여의대로" },
  { city: "서울특별시", gu: "강동구", dong: "천호동", road: "천호대로" },
  { city: "서울특별시", gu: "성동구", dong: "성수동", road: "뚝섬로" },
  { city: "서울특별시", gu: "광진구", dong: "자양동", road: "아차산로" },
  { city: "서울특별시", gu: "동작구", dong: "사당동", road: "동작대로" },
  { city: "서울특별시", gu: "노원구", dong: "상계동", road: "동일로" },
  { city: "서울특별시", gu: "중구", dong: "신당동", road: "다산로" },
  { city: "서울특별시", gu: "종로구", dong: "평창동", road: "평창문화로" },
  { city: "경기도 성남시 분당구", gu: "분당구", dong: "정자동", road: "정자일로" },
  { city: "경기도 수원시 영통구", gu: "영통구", dong: "영통동", road: "영통로" },
  { city: "경기도 고양시 일산서구", gu: "일산서구", dong: "주엽동", road: "중앙로" },
  { city: "경기도 용인시 수지구", gu: "수지구", dong: "죽전동", road: "포은대로" },
  { city: "경기도 화성시", gu: "동탄", dong: "동탄동", road: "동탄대로" },
  { city: "부산광역시", gu: "해운대구", dong: "우동", road: "해운대로" },
  { city: "부산광역시", gu: "수영구", dong: "광안동", road: "광안해변로" },
  { city: "인천광역시", gu: "연수구", dong: "송도동", road: "송도국제대로" },
  { city: "대전광역시", gu: "유성구", dong: "봉명동", road: "대학로" },
  { city: "대구광역시", gu: "수성구", dong: "범어동", road: "달구벌대로" },
];

const APT_NAMES = [
  "래미안퍼스티지", "래미안레벤투스", "아크로리버파크", "반포자이",
  "헬리오시티", "잠실엘스", "파크리오", "리센츠", "트리지움",
  "롯데캐슬", "자이르네", "더샵", "힐스테이트", "푸르지오",
  "아이파크", "위브", "센트레빌", "꿈에그린", "브라운스톤",
  "e편한세상", "SK뷰", "한신더휴", "현대홈타운", "두산위브더제니스",
  "GS자이", "대우푸르지오", "한화꿈에그린", "호반써밋", "중흥S클래스",
  "동부센트레빌", "KCC스위첸", "우미린", "금호어울림", "코오롱하늘채",
];

const VILLA_NAMES = [
  "청구빌라", "한양빌라", "동부빌라", "삼성빌라", "현대빌라",
  "그린빌라", "새한빌라", "대성빌라", "럭키빌라", "보라빌라",
];

const OFFICETEL_NAMES = [
  "강남파인", "디오빌", "월드메르디앙", "아크로텔", "시그니처타워",
  "비즈타워", "프라임오피스텔", "센트럴타워", "리버사이드", "파크원",
];

const STRUCTURES = [
  "철근콘크리트조", "철골철근콘크리트조", "철골콘크리트조",
  "조적조", "경량철골조", "철골조",
];

const ROOF_TYPES = [
  "지붕슬래브방수", "슬래브지붕", "평지붕", "경사지붕",
];

const PURPOSES = ["아파트", "다세대주택", "연립주택", "오피스텔", "다가구주택"];

const LAST_NAMES = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍",
  "전", "고", "문", "양", "손", "배", "백", "허", "남", "심",
];

const FIRST_NAMES = [
  "영수", "지민", "현우", "수진", "민서", "서연", "도현", "은지",
  "재호", "하늘", "성민", "유진", "태현", "소영", "준혁", "미영",
  "동욱", "혜진", "상호", "정민", "승현", "다은", "지훈", "세진",
  "우진", "나영", "시우", "예린", "건우", "수빈", "민재", "하은",
];

const BANKS = [
  "국민은행", "신한은행", "하나은행", "우리은행", "농협은행",
  "기업은행", "케이뱅크", "카카오뱅크", "SC제일은행", "대구은행",
  "부산은행", "수협은행",
];

const COMPANIES = [
  "대한건설주식회사", "삼성물산주식회사", "현대건설주식회사",
  "GS건설주식회사", "롯데건설주식회사", "대우건설주식회사",
  "포스코건설주식회사", "SK에코플랜트주식회사", "HDC현대산업개발주식회사",
  "호반건설주식회사", "한화건설주식회사", "태영건설주식회사",
];

const COURTS = [
  "서울중앙지방법원", "서울남부지방법원", "서울동부지방법원",
  "서울서부지방법원", "서울북부지방법원", "수원지방법원",
  "인천지방법원", "부산지방법원", "대전지방법원", "대구지방법원",
];

// ─── 유틸 함수 ───

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function genDate(yearMin: number, yearMax: number): { y: number; m: number; d: number } {
  const y = rand(yearMin, yearMax);
  const m = rand(1, 12);
  const d = rand(1, 28);
  return { y, m, d };
}

function fmtDate(d: { y: number; m: number; d: number }): string {
  return `${d.y}년${d.m}월${d.d}일`;
}

function addDays(d: { y: number; m: number; d: number }, days: number) {
  const dt = new Date(d.y, d.m - 1, d.d + days);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

function genName(): string {
  return pick(LAST_NAMES) + pick(FIRST_NAMES);
}

function genRrn(): string {
  const y = rand(50, 99);
  const m = String(rand(1, 12)).padStart(2, "0");
  const d = String(rand(1, 28)).padStart(2, "0");
  const g = pick(["1", "2"]);
  return `${y}${m}${d}-${g}${rand(100000, 999999)}`;
}

function genCorpNum(): string {
  return `${rand(100000, 999999)}-${String(rand(0, 9999999)).padStart(7, "0")}`;
}

function genReceiptNo(): string {
  return `제${rand(10000, 99999)}호`;
}

function genUniqueNo(gu: string): string {
  return `${rand(1100, 9999)}-${rand(2018, 2025)}-${String(rand(1, 999999)).padStart(6, "0")}`;
}

function fmtAmount(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const man = Math.floor((won % 100000000) / 10000);
    if (man > 0) return `금 ${eok}억 ${man.toLocaleString()}만원`;
    return `금 ${eok}억원`;
  }
  return `금 ${(won / 10000).toLocaleString()}만원`;
}

function fmtAmountNum(won: number): string {
  return `금 ${won.toLocaleString()}원`;
}

// ─── 등기부등본 타입별 생성 ───

type PropertyType = "apt" | "villa" | "officetel";

interface RegistryConfig {
  type: PropertyType;
  riskLevel: "clean" | "low" | "medium" | "high" | "critical";
}

function generateRegistry(config: RegistryConfig, index: number): string {
  const district = pick(DISTRICTS);
  const lotNum = `${rand(1, 999)}-${rand(1, 99)}`;

  // 건물 유형별 설정
  let buildingName: string;
  let dong = "";
  let floor: number;
  let ho: number;
  let area: number;
  let purpose: string;
  let structure: string;

  switch (config.type) {
    case "apt":
      buildingName = pick(APT_NAMES);
      dong = `제${rand(101, 115)}동`;
      floor = rand(1, 35);
      ho = floor * 100 + rand(1, 8) * 100 + rand(1, 4);
      area = pick([59.96, 74.98, 84.97, 84.99, 101.83, 114.92, 134.97, 156.72]);
      purpose = "아파트";
      structure = pick(["철근콘크리트조", "철골철근콘크리트조"]);
      break;
    case "villa":
      buildingName = pick(VILLA_NAMES);
      floor = rand(1, 5);
      ho = floor * 100 + rand(1, 4);
      area = pick([33.06, 39.67, 46.28, 52.89, 59.50, 66.12]);
      purpose = pick(["다세대주택", "연립주택", "다가구주택"]);
      structure = pick(["철근콘크리트조", "조적조", "경량철골조"]);
      break;
    case "officetel":
      buildingName = pick(OFFICETEL_NAMES);
      floor = rand(1, 25);
      ho = floor * 100 + rand(1, 20);
      area = pick([19.83, 24.79, 29.75, 33.06, 39.67, 46.28]);
      purpose = "오피스텔";
      structure = pick(["철근콘크리트조", "철골철근콘크리트조", "철골조"]);
      break;
  }

  const roof = pick(ROOF_TYPES);
  const landRatioDenom = rand(30000, 80000);

  // 건물 연도 (2005~2023)
  const buildYear = rand(2005, 2023);
  const titleDate = genDate(buildYear, buildYear);

  // 매매가 결정 (타입에 따라)
  let basePrice: number;
  switch (config.type) {
    case "apt":
      basePrice = rand(3, 25) * 100000000; // 3억~25억
      break;
    case "villa":
      basePrice = rand(1, 6) * 100000000; // 1억~6억
      break;
    case "officetel":
      basePrice = rand(1, 8) * 100000000; // 1억~8억
      break;
  }

  // ─── 표제부 ───
  const hoStr = config.type === "apt"
    ? `${dong} 제${floor}층 제${ho}호`
    : `제${floor}층 제${ho}호`;

  let titleSection = `【 표 제 부 】 (건물의 표시)\n\n`;
  titleSection += ` 표시번호 |  접  수  |     소재지번 및 건물번호     |        건물내역        | 등기원인 및 기타사항\n`;
  titleSection += `─────────────────────────────────────────────────────────────────────────────\n`;
  titleSection += `    1     ${fmtDate(titleDate)}  ${district.city} ${district.gu} ${district.dong}      ${structure}           [대지권의 목적인 토지의 표시]\n`;
  titleSection += `                        ${lotNum} ${buildingName}         ${roof}           ${district.city} ${district.gu} ${district.dong}\n`;
  titleSection += `                        ${hoStr}       ${purpose}                   ${lotNum}\n`;
  titleSection += `                                                     ${area}㎡                  대지권비율 ${landRatioDenom}.${rand(1, 9)}분의 ${area}\n`;

  // ─── 갑구 생성 ───
  let gapguEntries: string[] = [];
  let seqGap = 1;
  let receiptSeq = rand(10000, 20000);

  // 1) 소유권보존 (최초)
  const preserveDate = addDays(titleDate, rand(3, 30));
  const company = pick(COMPANIES);
  gapguEntries.push(
    `    ${seqGap}     소유권보존   ${fmtDate(preserveDate)}    ${fmtDate(titleDate)}        소유자 ${company}\n` +
    `                      제${receiptSeq}호        보존등기              ${genCorpNum()}`
  );
  seqGap++;
  receiptSeq += rand(100, 2000);

  // 2) 소유권이전 체인 (1~3회)
  const transferCount = rand(1, 3);
  let currentOwner = "";
  let currentOwnerRrn = "";
  let lastTransferDate = preserveDate;

  for (let t = 0; t < transferCount; t++) {
    const tDate = genDate(lastTransferDate.y + (t === 0 ? 0 : 1), Math.min(lastTransferDate.y + 2, 2025));
    const regDate = addDays(tDate, rand(3, 15));
    const owner = genName();
    const rrn = genRrn();
    const addr = `${district.city} ${district.gu} ${pick(["역삼로", "서초대로", "올림픽로", "강남대로", "테헤란로", "도산대로"])} ${rand(1, 500)}`;
    const cause = t === 0 ? "매매" : pick(["매매", "매매", "매매", "상속", "증여"]);

    receiptSeq += rand(100, 3000);
    gapguEntries.push(
      `    ${seqGap}     소유권이전   ${fmtDate(regDate)}    ${fmtDate(tDate)}         소유자 ${owner}\n` +
      `                      제${receiptSeq}호        ${cause}                  ${rrn}\n` +
      `                                                            ${addr}`
    );
    currentOwner = owner;
    currentOwnerRrn = rrn;
    lastTransferDate = regDate;
    seqGap++;
    receiptSeq += rand(100, 2000);
  }

  // 3) 위험 항목 추가 (riskLevel에 따라)
  const riskDate = genDate(Math.max(lastTransferDate.y, 2023), 2025);

  if (config.riskLevel === "medium" || config.riskLevel === "high" || config.riskLevel === "critical") {
    // 가압류
    const seizureDate = addDays(riskDate, rand(1, 30));
    const court = pick(COURTS);
    const creditor = genName();
    const claimAmount = rand(5000, 50000) * 10000;
    receiptSeq += rand(100, 2000);
    gapguEntries.push(
      `    ${seqGap}     가압류      ${fmtDate(seizureDate)}    ${fmtDate(addDays(seizureDate, -1))}         채권자 ${creditor}\n` +
      `                      제${receiptSeq}호        ${court}       청구금액 ${fmtAmountNum(claimAmount)}\n` +
      `                                      ${seizureDate.y}카단${rand(10000, 99999)}`
    );
    seqGap++;
    receiptSeq += rand(100, 1000);

    // 해제 여부 (medium이면 해제, high/critical이면 유지)
    if (config.riskLevel === "medium") {
      gapguEntries.push(
        `          가압류말소   ${fmtDate(addDays(seizureDate, rand(30, 180)))}    해제\n` +
        `                      제${receiptSeq}호`
      );
      receiptSeq += rand(100, 1000);
    }
  }

  if (config.riskLevel === "high" || config.riskLevel === "critical") {
    // 압류
    const seizureDate2 = addDays(riskDate, rand(60, 180));
    const taxOffice = pick(["서울특별시 강남구", "서울특별시 서초구", "국세청", "서울특별시 송파구"]);
    receiptSeq += rand(100, 2000);
    gapguEntries.push(
      `    ${seqGap}     압류        ${fmtDate(seizureDate2)}    ${fmtDate(addDays(seizureDate2, -1))}         압류권자 ${taxOffice}\n` +
      `                      제${receiptSeq}호        체납처분                  국세체납`
    );
    seqGap++;
    receiptSeq += rand(100, 1000);
  }

  if (config.riskLevel === "critical") {
    // 경매개시결정
    const auctionDate = addDays(riskDate, rand(180, 365));
    const court = pick(COURTS);
    receiptSeq += rand(100, 2000);
    gapguEntries.push(
      `    ${seqGap}     경매개시결정  ${fmtDate(auctionDate)}    ${fmtDate(addDays(auctionDate, -3))}        채권자 ${pick(BANKS)}\n` +
      `                      제${receiptSeq}호        ${court}       ${auctionDate.y}타경${rand(10000, 99999)}\n` +
      `                                      임의경매`
    );
    seqGap++;
    receiptSeq += rand(100, 1000);
  }

  // 가처분 (일부 케이스)
  if (config.riskLevel === "high" && Math.random() > 0.5) {
    const injDate = genDate(2024, 2025);
    const court = pick(COURTS);
    receiptSeq += rand(100, 2000);
    gapguEntries.push(
      `    ${seqGap}     처분금지가처분  ${fmtDate(injDate)}    ${fmtDate(addDays(injDate, -2))}      채권자 ${genName()}\n` +
      `                      제${receiptSeq}호        ${court}\n` +
      `                                      ${injDate.y}카합${rand(1000, 9999)}`
    );
    seqGap++;
  }

  // 신탁 (일부 케이스)
  if (config.riskLevel === "low" && Math.random() > 0.6) {
    const trustDate = genDate(lastTransferDate.y, 2025);
    receiptSeq += rand(100, 2000);
    const trustee = pick(["한국토지신탁", "코리아신탁", "한국자산신탁", "대한토지신탁"]);
    gapguEntries.push(
      `    ${seqGap}     신탁        ${fmtDate(trustDate)}    ${fmtDate(addDays(trustDate, -3))}         수탁자 ${trustee}\n` +
      `                      제${receiptSeq}호        신탁                      위탁자 ${currentOwner}`
    );
    seqGap++;
  }

  // ─── 을구 생성 ───
  let eulguEntries: string[] = [];
  let seqEul = 1;
  let eulReceiptSeq = rand(20000, 40000);

  // 근저당 (대부분 있음)
  if (config.riskLevel !== "clean" || Math.random() > 0.3) {
    const mortgageCount = config.riskLevel === "critical" ? rand(2, 3) : config.riskLevel === "high" ? rand(1, 3) : rand(1, 2);

    for (let mi = 0; mi < mortgageCount; mi++) {
      const mDate = genDate(lastTransferDate.y, 2025);
      const regDate = addDays(mDate, rand(2, 10));
      const bank = pick(BANKS);
      const maxDebt = Math.round(basePrice * pick([0.6, 0.7, 0.8, 0.84, 0.9, 1.0, 1.2]));
      eulReceiptSeq += rand(100, 2000);

      let entry = `    ${seqEul}     근저당권설정  ${fmtDate(regDate)}   ${fmtDate(mDate)}         채권최고액 ${fmtAmountNum(maxDebt)}\n`;
      entry += `                      제${eulReceiptSeq}호        설정계약              근저당권자 ${bank}\n`;
      entry += `                                                            채무자 ${currentOwner}`;

      // 이전 근저당 말소 (clean/low에서)
      if (mi < mortgageCount - 1 && (config.riskLevel === "clean" || config.riskLevel === "low")) {
        const delDate = addDays(regDate, rand(365, 1095));
        eulReceiptSeq += rand(10, 500);
        entry += `\n          ${seqEul}번근저당권말소 ${fmtDate(delDate)}  해제\n`;
        entry += `                      제${eulReceiptSeq}호`;
      }

      eulguEntries.push(entry);
      seqEul++;
      eulReceiptSeq += rand(100, 2000);
    }
  }

  // 전세권설정 (일부)
  if (Math.random() > 0.5) {
    const jDate = genDate(2022, 2025);
    const regDate = addDays(jDate, rand(1, 7));
    const jeonseHolder = genName();
    const jeonseAmount = Math.round(basePrice * pick([0.5, 0.6, 0.65, 0.7, 0.75, 0.8]));
    const endDate = addDays(jDate, 730); // 2년
    eulReceiptSeq += rand(100, 2000);

    eulguEntries.push(
      `    ${seqEul}     전세권설정   ${fmtDate(regDate)}    ${fmtDate(jDate)}          전세금 ${fmtAmountNum(jeonseAmount)}\n` +
      `                      제${eulReceiptSeq}호        설정계약              전세권자 ${jeonseHolder}\n` +
      `                                                            범위: 건물전부\n` +
      `                                                            존속기간: ${fmtDate(jDate)}부터 ${fmtDate(endDate)}까지`
    );
    seqEul++;
    eulReceiptSeq += rand(100, 2000);
  }

  // 임차권등기명령 (고위험에서 일부)
  if ((config.riskLevel === "high" || config.riskLevel === "critical") && Math.random() > 0.5) {
    const lDate = genDate(2024, 2025);
    const court = pick(COURTS);
    const tenant = genName();
    const deposit = Math.round(basePrice * pick([0.4, 0.5, 0.6, 0.7]));
    eulReceiptSeq += rand(100, 2000);

    eulguEntries.push(
      `    ${seqEul}     임차권등기   ${fmtDate(lDate)}    ${fmtDate(addDays(lDate, -5))}         임차권자 ${tenant}\n` +
      `                      제${eulReceiptSeq}호        ${court}       보증금 ${fmtAmountNum(deposit)}\n` +
      `                                      ${lDate.y}비합${rand(100, 9999)}\n` +
      `                                                            범위: 건물전부`
    );
    seqEul++;
  }

  // 지상권 (드물게)
  if (Math.random() > 0.9) {
    const sDate = genDate(2020, 2024);
    eulReceiptSeq += rand(100, 2000);

    eulguEntries.push(
      `    ${seqEul}     지상권설정   ${fmtDate(sDate)}    ${fmtDate(addDays(sDate, -3))}         지상권자 ${pick(COMPANIES)}\n` +
      `                      제${eulReceiptSeq}호        설정계약              목적: 건물소유\n` +
      `                                                            범위: 대지전부\n` +
      `                                                            존속기간: ${fmtDate(sDate)}부터 30년`
    );
    seqEul++;
  }

  // ─── 문서 조합 ───
  const uniqueNo = genUniqueNo(district.gu);
  const buildingType = config.type === "apt" ? "건물" : config.type === "officetel" ? "집합건물" : "건물";

  let doc = `──────────────────────────────────────────────────────\n`;
  doc += `                    등 기 부 등 본 (${buildingType})\n`;
  doc += `                    고유번호: ${uniqueNo}\n`;
  doc += `──────────────────────────────────────────────────────\n\n`;
  doc += titleSection;
  doc += `\n\n【 갑 구 】 (소유권에 관한 사항)\n\n`;
  doc += ` 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항\n`;
  doc += `─────────────────────────────────────────────────────────────────────────────\n`;
  doc += gapguEntries.join("\n\n");
  doc += `\n\n【 을 구 】 (소유권 이외의 권리에 관한 사항)\n\n`;
  doc += ` 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항\n`;
  doc += `─────────────────────────────────────────────────────────────────────────────\n`;
  doc += eulguEntries.join("\n\n");

  return doc;
}

// ─── 메인 실행 ───

const OUTPUT_DIR = path.join(__dirname, "output", "registry-samples");
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// 50개 배분: clean 10, low 12, medium 12, high 10, critical 6
const configs: RegistryConfig[] = [
  ...Array(10).fill(null).map(() => ({ type: pick(["apt", "villa", "officetel"] as PropertyType[]), riskLevel: "clean" as const })),
  ...Array(12).fill(null).map(() => ({ type: pick(["apt", "villa", "officetel"] as PropertyType[]), riskLevel: "low" as const })),
  ...Array(12).fill(null).map(() => ({ type: pick(["apt", "villa", "officetel"] as PropertyType[]), riskLevel: "medium" as const })),
  ...Array(10).fill(null).map(() => ({ type: pick(["apt", "villa", "officetel"] as PropertyType[]), riskLevel: "high" as const })),
  ...Array(6).fill(null).map(() => ({ type: pick(["apt", "villa", "officetel"] as PropertyType[]), riskLevel: "critical" as const })),
];

// 셔플
configs.sort(() => Math.random() - 0.5);

const summary: { file: string; type: string; risk: string; gapgu: number; eulgu: number }[] = [];

configs.forEach((config, i) => {
  const text = generateRegistry(config, i);
  const filename = `registry_${String(i + 1).padStart(3, "0")}_${config.type}_${config.riskLevel}.txt`;
  const filepath = path.join(OUTPUT_DIR, filename);
  writeFileSync(filepath, text, "utf-8");

  // 갑구/을구 항목 수 세기
  const gapguCount = (text.match(/【 갑 구 】[\s\S]*?(?=【 을 구 】)/)?.[0]?.match(/^\s{4}\d+\s/gm) || []).length;
  const eulguCount = (text.match(/【 을 구 】[\s\S]*/)?.[0]?.match(/^\s{4}\d+\s/gm) || []).length;

  summary.push({ file: filename, type: config.type, risk: config.riskLevel, gapgu: gapguCount, eulgu: eulguCount });
});

// 요약 출력
console.log(`\n✅ 등기부등본 ${configs.length}개 생성 완료!`);
console.log(`📁 저장 위치: ${OUTPUT_DIR}\n`);
console.log("─".repeat(80));
console.log(`${"파일명".padEnd(50)} ${"유형".padEnd(12)} ${"위험도".padEnd(10)} 갑구  을구`);
console.log("─".repeat(80));

const riskStats: Record<string, number> = {};
const typeStats: Record<string, number> = {};

summary.forEach((s) => {
  console.log(`${s.file.padEnd(50)} ${s.type.padEnd(12)} ${s.risk.padEnd(10)} ${String(s.gapgu).padStart(3)}   ${String(s.eulgu).padStart(3)}`);
  riskStats[s.risk] = (riskStats[s.risk] || 0) + 1;
  typeStats[s.type] = (typeStats[s.type] || 0) + 1;
});

console.log("\n─".repeat(40));
console.log("📊 위험도 분포:");
Object.entries(riskStats).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}개`));
console.log("\n🏠 건물 유형 분포:");
Object.entries(typeStats).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}개`));
