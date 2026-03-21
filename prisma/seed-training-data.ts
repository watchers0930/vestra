/**
 * 등기부등본 학습 데이터 시드 스크립트
 * ──────────────────────────────────────
 * 도메인 특화 NLP 모델 학습용 라벨링된 TrainingData 50+ 건 시드.
 * 갑구/을구/표제부 다양한 패턴 포함.
 *
 * 실행: npx tsx prisma/seed-training-data.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// ─── 카테고리 정의 ───

type RegistryCategory = "registry_갑구" | "registry_을구" | "registry_표제부";

interface TrainingSample {
  rawText: string;
  expectedOutput: Record<string, unknown>;
  category: RegistryCategory;
  confidence: number;
  sourceFileName: string;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// AES-256-GCM 암호화 (TrainingData 스키마의 rawTextEncrypted 필드용)
function encryptText(plaintext: string): string {
  const secret = process.env.AUTH_SECRET || "vestra-default-secret-change-me";
  const key = crypto.scryptSync(secret, "vestra-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

// ─── 근저당권 설정 샘플 (10건) ───

const mortgageSamples: TrainingSample[] = [
  {
    rawText: "【을구】 1. 근저당권설정 접수 2023년5월15일 제12345호\n채권최고액 금360,000,000원\n근저당권자 주식회사 국민은행\n채무자 김철수",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2023-05-15",
      receptionNumber: "12345",
      maxClaimAmount: 360000000,
      mortgagee: "주식회사 국민은행",
      debtor: "김철수",
    },
    category: "registry_을구",
    confidence: 95,
    sourceFileName: "sample_mortgage_01.pdf",
  },
  {
    rawText: "【을구】 2. 근저당권설정 접수 2024년1월8일 제4567호\n채권최고액 금480,000,000원\n근저당권자 주식회사 신한은행\n채무자 박영희\n공동담보목록 제2024-123호",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2024-01-08",
      receptionNumber: "4567",
      maxClaimAmount: 480000000,
      mortgagee: "주식회사 신한은행",
      debtor: "박영희",
      jointMortgageList: "2024-123",
    },
    category: "registry_을구",
    confidence: 97,
    sourceFileName: "sample_mortgage_02.pdf",
  },
  {
    rawText: "【을구】 3. 근저당권설정 접수 2022년11월20일 제78901호\n채권최고액 금240,000,000원\n근저당권자 주식회사 우리은행\n채무자 이민수\n채무자 이민주(공동채무)",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2022-11-20",
      receptionNumber: "78901",
      maxClaimAmount: 240000000,
      mortgagee: "주식회사 우리은행",
      debtors: ["이민수", "이민주"],
      isJointDebt: true,
    },
    category: "registry_을구",
    confidence: 93,
    sourceFileName: "sample_mortgage_03.pdf",
  },
  {
    rawText: "【을구】 1. 근저당권설정 접수 2023년7월3일 제23456호\n채권최고액 금600,000,000원\n근저당권자 주식회사 하나은행\n채무자 주식회사 대한건설",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2023-07-03",
      receptionNumber: "23456",
      maxClaimAmount: 600000000,
      mortgagee: "주식회사 하나은행",
      debtor: "주식회사 대한건설",
      isCorporateDebtor: true,
    },
    category: "registry_을구",
    confidence: 96,
    sourceFileName: "sample_mortgage_04.pdf",
  },
  {
    rawText: "【을구】 4. 근저당권설정 접수 2024년3월12일 제34567호\n채권최고액 금156,000,000원\n근저당권자 농업협동조합중앙회\n채무자 정현우",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2024-03-12",
      receptionNumber: "34567",
      maxClaimAmount: 156000000,
      mortgagee: "농업협동조합중앙회",
      debtor: "정현우",
    },
    category: "registry_을구",
    confidence: 94,
    sourceFileName: "sample_mortgage_05.pdf",
  },
  {
    rawText: "【을구】 2. 근저당권설정 접수 2023년9월25일 제56789호\n채권최고액 금1,200,000,000원\n근저당권자 주식회사 케이비국민은행\n채무자 한국자산신탁 주식회사\n위탁자 겸 수익자 최진호",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2023-09-25",
      receptionNumber: "56789",
      maxClaimAmount: 1200000000,
      mortgagee: "주식회사 케이비국민은행",
      debtor: "한국자산신탁 주식회사",
      trustor: "최진호",
      isTrustProperty: true,
    },
    category: "registry_을구",
    confidence: 91,
    sourceFileName: "sample_mortgage_06.pdf",
  },
  {
    rawText: "【을구】 5. 근저당권변경 접수 2024년6월1일 제67890호\n변경사항: 채권최고액 금360,000,000원을 금480,000,000원으로 변경\n근저당권자 주식회사 신한은행",
    expectedOutput: {
      type: "근저당권변경",
      receptionDate: "2024-06-01",
      receptionNumber: "67890",
      previousAmount: 360000000,
      newAmount: 480000000,
      mortgagee: "주식회사 신한은행",
    },
    category: "registry_을구",
    confidence: 92,
    sourceFileName: "sample_mortgage_07.pdf",
  },
  {
    rawText: "【을구】 3. 근저당권말소 접수 2024년2월15일 제11111호\n말소사유: 변제\n말소된 근저당권: 을구 1번",
    expectedOutput: {
      type: "근저당권말소",
      receptionDate: "2024-02-15",
      receptionNumber: "11111",
      reason: "변제",
      targetEntry: "을구 1번",
    },
    category: "registry_을구",
    confidence: 96,
    sourceFileName: "sample_mortgage_08.pdf",
  },
  {
    rawText: "【을구】 1. 근저당권설정 접수 2022년4월10일 제22222호\n채권최고액 금900,000,000원\n근저당권자 수협은행\n채무자 김태호\n설정범위 1동 201호, 202호, 301호",
    expectedOutput: {
      type: "근저당권설정",
      receptionDate: "2022-04-10",
      receptionNumber: "22222",
      maxClaimAmount: 900000000,
      mortgagee: "수협은행",
      debtor: "김태호",
      scope: ["1동 201호", "202호", "301호"],
    },
    category: "registry_을구",
    confidence: 90,
    sourceFileName: "sample_mortgage_09.pdf",
  },
  {
    rawText: "【을구】 6. 근저당권이전 접수 2024년4월20일 제33333호\n이전사유: 채권양도\n양수인 에이비씨자산관리 주식회사\n양도인 주식회사 국민은행",
    expectedOutput: {
      type: "근저당권이전",
      receptionDate: "2024-04-20",
      receptionNumber: "33333",
      reason: "채권양도",
      transferee: "에이비씨자산관리 주식회사",
      transferor: "주식회사 국민은행",
    },
    category: "registry_을구",
    confidence: 93,
    sourceFileName: "sample_mortgage_10.pdf",
  },
];

// ─── 소유권 이전 샘플 (10건) ───

const ownershipSamples: TrainingSample[] = [
  {
    rawText: "【갑구】 1. 소유권이전 접수 2020년3월15일 제44444호\n원인 2020년3월10일 매매\n소유자 김철수 710515-1234567\n서울특별시 강남구 역삼동 123-4",
    expectedOutput: {
      type: "소유권이전",
      receptionDate: "2020-03-15",
      receptionNumber: "44444",
      cause: "매매",
      causeDate: "2020-03-10",
      owner: "김철수",
      address: "서울특별시 강남구 역삼동 123-4",
    },
    category: "registry_갑구",
    confidence: 97,
    sourceFileName: "sample_ownership_01.pdf",
  },
  {
    rawText: "【갑구】 2. 소유권이전 접수 2023년8월20일 제55555호\n원인 2023년8월15일 상속\n소유자 박지은 850320-2345678\n서울특별시 서초구 반포동 56-7",
    expectedOutput: {
      type: "소유권이전",
      receptionDate: "2023-08-20",
      receptionNumber: "55555",
      cause: "상속",
      causeDate: "2023-08-15",
      owner: "박지은",
      address: "서울특별시 서초구 반포동 56-7",
    },
    category: "registry_갑구",
    confidence: 96,
    sourceFileName: "sample_ownership_02.pdf",
  },
  {
    rawText: "【갑구】 3. 소유권이전 접수 2024년1월5일 제66666호\n원인 2023년12월28일 증여\n소유자 이영수 900101-1111111\n경기도 성남시 분당구 정자동 100",
    expectedOutput: {
      type: "소유권이전",
      receptionDate: "2024-01-05",
      receptionNumber: "66666",
      cause: "증여",
      causeDate: "2023-12-28",
      owner: "이영수",
      address: "경기도 성남시 분당구 정자동 100",
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_ownership_03.pdf",
  },
  {
    rawText: "【갑구】 1. 소유권보존 접수 2019년6월10일 제77777호\n소유자 주식회사 한양건설\n110111-1234567\n서울특별시 송파구 잠실동 200",
    expectedOutput: {
      type: "소유권보존",
      receptionDate: "2019-06-10",
      receptionNumber: "77777",
      owner: "주식회사 한양건설",
      isCorporate: true,
      address: "서울특별시 송파구 잠실동 200",
    },
    category: "registry_갑구",
    confidence: 94,
    sourceFileName: "sample_ownership_04.pdf",
  },
  {
    rawText: "【갑구】 4. 소유권이전 접수 2022년5월20일 제88888호\n원인 2022년5월18일 경매(임의)\n소유자 최민정 880612-2222222\n서울특별시 마포구 상암동 300-1",
    expectedOutput: {
      type: "소유권이전",
      receptionDate: "2022-05-20",
      receptionNumber: "88888",
      cause: "경매(임의)",
      causeDate: "2022-05-18",
      owner: "최민정",
      isAuction: true,
      address: "서울특별시 마포구 상암동 300-1",
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_ownership_05.pdf",
  },
  {
    rawText: "【갑구】 2. 소유권이전 접수 2021년11월1일 제99999호\n원인 2021년10월25일 매매\n공유자 김영호 지분 2분의1\n공유자 김영미 지분 2분의1",
    expectedOutput: {
      type: "소유권이전",
      receptionDate: "2021-11-01",
      receptionNumber: "99999",
      cause: "매매",
      causeDate: "2021-10-25",
      coOwners: [
        { name: "김영호", share: "2분의1" },
        { name: "김영미", share: "2분의1" },
      ],
      isJointOwnership: true,
    },
    category: "registry_갑구",
    confidence: 93,
    sourceFileName: "sample_ownership_06.pdf",
  },
  {
    rawText: "【갑구】 5. 소유권이전 접수 2023년4월12일 제10101호\n원인 2023년4월10일 판결\n소유자 한국토지주택공사 110111-0000001\n서울특별시 강서구 화곡동 450",
    expectedOutput: {
      type: "소유권이전",
      receptionDate: "2023-04-12",
      receptionNumber: "10101",
      cause: "판결",
      causeDate: "2023-04-10",
      owner: "한국토지주택공사",
      isPublicCorp: true,
    },
    category: "registry_갑구",
    confidence: 94,
    sourceFileName: "sample_ownership_07.pdf",
  },
  {
    rawText: "【갑구】 3. 소유권일부이전 접수 2024년2월1일 제20202호\n원인 2024년1월30일 매매\n지분 4분의1 이전\n소유자 정수진 950720-2333333",
    expectedOutput: {
      type: "소유권일부이전",
      receptionDate: "2024-02-01",
      receptionNumber: "20202",
      cause: "매매",
      causeDate: "2024-01-30",
      shareTransferred: "4분의1",
      owner: "정수진",
    },
    category: "registry_갑구",
    confidence: 92,
    sourceFileName: "sample_ownership_08.pdf",
  },
  {
    rawText: "【갑구】 6. 환매특약등기 접수 2023년6월15일 제30303호\n환매기간 2023년6월15일부터 2028년6월14일까지\n환매권자 서울특별시\n환매금액 금500,000,000원",
    expectedOutput: {
      type: "환매특약등기",
      receptionDate: "2023-06-15",
      receptionNumber: "30303",
      repurchasePeriodStart: "2023-06-15",
      repurchasePeriodEnd: "2028-06-14",
      repurchaser: "서울특별시",
      repurchaseAmount: 500000000,
    },
    category: "registry_갑구",
    confidence: 90,
    sourceFileName: "sample_ownership_09.pdf",
  },
  {
    rawText: "【갑구】 7. 소유권이전청구권가등기 접수 2024년3월5일 제40404호\n원인 2024년3월3일 매매예약\n가등기권자 송미영 920415-2444444",
    expectedOutput: {
      type: "소유권이전청구권가등기",
      receptionDate: "2024-03-05",
      receptionNumber: "40404",
      cause: "매매예약",
      causeDate: "2024-03-03",
      provisionalHolder: "송미영",
    },
    category: "registry_갑구",
    confidence: 91,
    sourceFileName: "sample_ownership_10.pdf",
  },
];

// ─── 가압류/가처분 샘플 (8건) ───

const seizureSamples: TrainingSample[] = [
  {
    rawText: "【갑구】 8. 가압류 접수 2024년5월10일 제50505호\n채권자 이순자\n청구금액 금120,000,000원\n서울중앙지방법원 2024카합12345",
    expectedOutput: {
      type: "가압류",
      receptionDate: "2024-05-10",
      receptionNumber: "50505",
      creditor: "이순자",
      claimAmount: 120000000,
      court: "서울중앙지방법원",
      caseNumber: "2024카합12345",
    },
    category: "registry_갑구",
    confidence: 96,
    sourceFileName: "sample_seizure_01.pdf",
  },
  {
    rawText: "【갑구】 9. 가처분 접수 2023년12월1일 제60606호\n채권자 주식회사 대한금융\n서울남부지방법원 2023카단67890\n처분금지가처분",
    expectedOutput: {
      type: "가처분",
      receptionDate: "2023-12-01",
      receptionNumber: "60606",
      creditor: "주식회사 대한금융",
      court: "서울남부지방법원",
      caseNumber: "2023카단67890",
      subType: "처분금지가처분",
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_seizure_02.pdf",
  },
  {
    rawText: "【갑구】 10. 가압류 접수 2024년2월20일 제70707호\n채권자 국민건강보험공단\n청구금액 금45,000,000원\n체납처분에 의한 압류",
    expectedOutput: {
      type: "가압류",
      receptionDate: "2024-02-20",
      receptionNumber: "70707",
      creditor: "국민건강보험공단",
      claimAmount: 45000000,
      isPublicSeizure: true,
      subType: "체납처분압류",
    },
    category: "registry_갑구",
    confidence: 94,
    sourceFileName: "sample_seizure_03.pdf",
  },
  {
    rawText: "【갑구】 11. 가압류말소 접수 2024년6월5일 제80808호\n말소사유: 본안판결\n말소된 가압류: 갑구 8번",
    expectedOutput: {
      type: "가압류말소",
      receptionDate: "2024-06-05",
      receptionNumber: "80808",
      reason: "본안판결",
      targetEntry: "갑구 8번",
    },
    category: "registry_갑구",
    confidence: 96,
    sourceFileName: "sample_seizure_04.pdf",
  },
  {
    rawText: "【갑구】 12. 압류 접수 2023년9월15일 제90909호\n압류권자 서울특별시 강남구청\n체납세목 재산세\n체납액 금15,000,000원",
    expectedOutput: {
      type: "압류",
      receptionDate: "2023-09-15",
      receptionNumber: "90909",
      seizureHolder: "서울특별시 강남구청",
      taxType: "재산세",
      delinquentAmount: 15000000,
      isPublicSeizure: true,
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_seizure_05.pdf",
  },
  {
    rawText: "【갑구】 13. 가처분 접수 2024년4월8일 제11122호\n채권자 홍길동\n수원지방법원 2024카합33445\n부동산점유이전금지가처분",
    expectedOutput: {
      type: "가처분",
      receptionDate: "2024-04-08",
      receptionNumber: "11122",
      creditor: "홍길동",
      court: "수원지방법원",
      caseNumber: "2024카합33445",
      subType: "부동산점유이전금지가처분",
    },
    category: "registry_갑구",
    confidence: 93,
    sourceFileName: "sample_seizure_06.pdf",
  },
  {
    rawText: "【갑구】 14. 가압류 접수 2024년1월15일 제22233호\n채권자 주식회사 롯데캐피탈\n청구금액 금78,000,000원\n서울동부지방법원 2024카합55667",
    expectedOutput: {
      type: "가압류",
      receptionDate: "2024-01-15",
      receptionNumber: "22233",
      creditor: "주식회사 롯데캐피탈",
      claimAmount: 78000000,
      court: "서울동부지방법원",
      caseNumber: "2024카합55667",
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_seizure_07.pdf",
  },
  {
    rawText: "【갑구】 15. 가압류 접수 2023년7월22일 제33344호\n채권자 근로복지공단\n청구금액 금32,000,000원\n체납처분에 의한 압류\n(국세징수법에 의한 압류)",
    expectedOutput: {
      type: "가압류",
      receptionDate: "2023-07-22",
      receptionNumber: "33344",
      creditor: "근로복지공단",
      claimAmount: 32000000,
      isPublicSeizure: true,
      subType: "국세징수법압류",
    },
    category: "registry_갑구",
    confidence: 94,
    sourceFileName: "sample_seizure_08.pdf",
  },
];

// ─── 전세권 설정 샘플 (8건) ───

const jeonseRightSamples: TrainingSample[] = [
  {
    rawText: "【을구】 2. 전세권설정 접수 2023년10월1일 제44455호\n전세금 금300,000,000원\n존속기간 2023년10월1일부터 2025년9월30일까지\n전세권자 강민수",
    expectedOutput: {
      type: "전세권설정",
      receptionDate: "2023-10-01",
      receptionNumber: "44455",
      deposit: 300000000,
      durationStart: "2023-10-01",
      durationEnd: "2025-09-30",
      holder: "강민수",
    },
    category: "registry_을구",
    confidence: 97,
    sourceFileName: "sample_jeonse_01.pdf",
  },
  {
    rawText: "【을구】 3. 전세권설정 접수 2024년3월15일 제55566호\n전세금 금450,000,000원\n존속기간 2024년3월15일부터 2026년3월14일까지\n전세권자 윤서현\n범위: 3층 301호",
    expectedOutput: {
      type: "전세권설정",
      receptionDate: "2024-03-15",
      receptionNumber: "55566",
      deposit: 450000000,
      durationStart: "2024-03-15",
      durationEnd: "2026-03-14",
      holder: "윤서현",
      scope: "3층 301호",
    },
    category: "registry_을구",
    confidence: 96,
    sourceFileName: "sample_jeonse_02.pdf",
  },
  {
    rawText: "【을구】 4. 전세권말소 접수 2024년4월10일 제66677호\n말소사유: 존속기간 만료\n말소된 전세권: 을구 2번",
    expectedOutput: {
      type: "전세권말소",
      receptionDate: "2024-04-10",
      receptionNumber: "66677",
      reason: "존속기간 만료",
      targetEntry: "을구 2번",
    },
    category: "registry_을구",
    confidence: 97,
    sourceFileName: "sample_jeonse_03.pdf",
  },
  {
    rawText: "【을구】 5. 전세권설정 접수 2022년6월20일 제77788호\n전세금 금200,000,000원\n존속기간 2022년6월20일부터 2024년6월19일까지\n전세권자 조현진\n전전세가능",
    expectedOutput: {
      type: "전세권설정",
      receptionDate: "2022-06-20",
      receptionNumber: "77788",
      deposit: 200000000,
      durationStart: "2022-06-20",
      durationEnd: "2024-06-19",
      holder: "조현진",
      sublettingAllowed: true,
    },
    category: "registry_을구",
    confidence: 94,
    sourceFileName: "sample_jeonse_04.pdf",
  },
  {
    rawText: "【을구】 6. 전세권변경 접수 2024년5월1일 제88899호\n변경사항: 전세금 금300,000,000원을 금350,000,000원으로 증액\n전세권자 강민수",
    expectedOutput: {
      type: "전세권변경",
      receptionDate: "2024-05-01",
      receptionNumber: "88899",
      previousDeposit: 300000000,
      newDeposit: 350000000,
      holder: "강민수",
    },
    category: "registry_을구",
    confidence: 93,
    sourceFileName: "sample_jeonse_05.pdf",
  },
  {
    rawText: "【을구】 7. 전세권설정 접수 2023년12월10일 제99900호\n전세금 금550,000,000원\n존속기간 2023년12월10일부터 2025년12월9일까지\n전세권자 임채원\n설정범위: 4층 전부",
    expectedOutput: {
      type: "전세권설정",
      receptionDate: "2023-12-10",
      receptionNumber: "99900",
      deposit: 550000000,
      durationStart: "2023-12-10",
      durationEnd: "2025-12-09",
      holder: "임채원",
      scope: "4층 전부",
    },
    category: "registry_을구",
    confidence: 95,
    sourceFileName: "sample_jeonse_06.pdf",
  },
  {
    rawText: "【을구】 8. 전세권이전 접수 2024년6월15일 제10011호\n이전사유: 전세권양도\n양수인 배수정\n양도인 강민수",
    expectedOutput: {
      type: "전세권이전",
      receptionDate: "2024-06-15",
      receptionNumber: "10011",
      reason: "전세권양도",
      transferee: "배수정",
      transferor: "강민수",
    },
    category: "registry_을구",
    confidence: 93,
    sourceFileName: "sample_jeonse_07.pdf",
  },
  {
    rawText: "【을구】 9. 전세권설정 접수 2024년7월1일 제11100호\n전세금 금180,000,000원\n존속기간 2024년7월1일부터 2026년6월30일까지\n전세권자 김나영\n대항력 있음(확정일자 2024년7월2일)",
    expectedOutput: {
      type: "전세권설정",
      receptionDate: "2024-07-01",
      receptionNumber: "11100",
      deposit: 180000000,
      durationStart: "2024-07-01",
      durationEnd: "2026-06-30",
      holder: "김나영",
      hasConfirmationDate: true,
      confirmationDate: "2024-07-02",
    },
    category: "registry_을구",
    confidence: 92,
    sourceFileName: "sample_jeonse_08.pdf",
  },
];

// ─── 신탁 등기 샘플 (5건) ───

const trustSamples: TrainingSample[] = [
  {
    rawText: "【갑구】 3. 신탁 접수 2022년3월1일 제12121호\n원인 2022년2월28일 신탁\n수탁자 한국자산신탁 주식회사\n위탁자 김동원\n신탁원부 제2022-567호",
    expectedOutput: {
      type: "신탁",
      receptionDate: "2022-03-01",
      receptionNumber: "12121",
      cause: "신탁",
      causeDate: "2022-02-28",
      trustee: "한국자산신탁 주식회사",
      trustor: "김동원",
      trustRegisterNumber: "2022-567",
    },
    category: "registry_갑구",
    confidence: 94,
    sourceFileName: "sample_trust_01.pdf",
  },
  {
    rawText: "【갑구】 4. 신탁 접수 2023년1월15일 제23232호\n원인 2023년1월10일 담보신탁\n수탁자 코리아신탁 주식회사\n위탁자 주식회사 현대건설\n우선수익자 주식회사 국민은행\n신탁원부 제2023-890호",
    expectedOutput: {
      type: "신탁",
      receptionDate: "2023-01-15",
      receptionNumber: "23232",
      cause: "담보신탁",
      causeDate: "2023-01-10",
      trustee: "코리아신탁 주식회사",
      trustor: "주식회사 현대건설",
      priorityBeneficiary: "주식회사 국민은행",
      trustRegisterNumber: "2023-890",
      isMortgageTrust: true,
    },
    category: "registry_갑구",
    confidence: 93,
    sourceFileName: "sample_trust_02.pdf",
  },
  {
    rawText: "【갑구】 5. 신탁변경 접수 2024년2월10일 제34343호\n변경사항: 우선수익자 변경\n변경전 주식회사 국민은행 → 변경후 주식회사 신한은행\n수탁자 코리아신탁 주식회사",
    expectedOutput: {
      type: "신탁변경",
      receptionDate: "2024-02-10",
      receptionNumber: "34343",
      changeType: "우선수익자 변경",
      previousBeneficiary: "주식회사 국민은행",
      newBeneficiary: "주식회사 신한은행",
      trustee: "코리아신탁 주식회사",
    },
    category: "registry_갑구",
    confidence: 91,
    sourceFileName: "sample_trust_03.pdf",
  },
  {
    rawText: "【갑구】 6. 신탁해지 접수 2024년5월20일 제45454호\n원인 2024년5월18일 신탁해지\n해지사유: 사업완료\n수탁자 한국자산신탁 주식회사",
    expectedOutput: {
      type: "신탁해지",
      receptionDate: "2024-05-20",
      receptionNumber: "45454",
      cause: "신탁해지",
      causeDate: "2024-05-18",
      reason: "사업완료",
      trustee: "한국자산신탁 주식회사",
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_trust_04.pdf",
  },
  {
    rawText: "【갑구】 7. 신탁 접수 2023년8월5일 제56565호\n원인 2023년8월1일 관리처분신탁\n수탁자 대한토지신탁 주식회사\n위탁자 정비조합(가로주택정비사업)\n신탁원부 제2023-1234호",
    expectedOutput: {
      type: "신탁",
      receptionDate: "2023-08-05",
      receptionNumber: "56565",
      cause: "관리처분신탁",
      causeDate: "2023-08-01",
      trustee: "대한토지신탁 주식회사",
      trustor: "정비조합(가로주택정비사업)",
      trustRegisterNumber: "2023-1234",
      isRedevelopmentTrust: true,
    },
    category: "registry_갑구",
    confidence: 92,
    sourceFileName: "sample_trust_05.pdf",
  },
];

// ─── 경매개시결정 샘플 (5건) ───

const auctionSamples: TrainingSample[] = [
  {
    rawText: "【갑구】 8. 임의경매개시결정 접수 2024년3월1일 제67676호\n서울중앙지방법원 2024타경12345\n채권자 주식회사 국민은행\n청구금액 금450,000,000원",
    expectedOutput: {
      type: "임의경매개시결정",
      receptionDate: "2024-03-01",
      receptionNumber: "67676",
      court: "서울중앙지방법원",
      caseNumber: "2024타경12345",
      creditor: "주식회사 국민은행",
      claimAmount: 450000000,
      auctionType: "임의경매",
    },
    category: "registry_갑구",
    confidence: 97,
    sourceFileName: "sample_auction_01.pdf",
  },
  {
    rawText: "【갑구】 9. 강제경매개시결정 접수 2024년4월15일 제78787호\n수원지방법원 2024타경67890\n채권자 이종호\n청구금액 금80,000,000원\n집행권원 수원지방법원 2023가단11111 판결",
    expectedOutput: {
      type: "강제경매개시결정",
      receptionDate: "2024-04-15",
      receptionNumber: "78787",
      court: "수원지방법원",
      caseNumber: "2024타경67890",
      creditor: "이종호",
      claimAmount: 80000000,
      auctionType: "강제경매",
      executionTitle: "수원지방법원 2023가단11111 판결",
    },
    category: "registry_갑구",
    confidence: 96,
    sourceFileName: "sample_auction_02.pdf",
  },
  {
    rawText: "【갑구】 10. 임의경매개시결정취소 접수 2024년6월1일 제89898호\n취소사유: 채무변제\n취소된 결정: 갑구 8번\n서울중앙지방법원",
    expectedOutput: {
      type: "임의경매개시결정취소",
      receptionDate: "2024-06-01",
      receptionNumber: "89898",
      reason: "채무변제",
      targetEntry: "갑구 8번",
      court: "서울중앙지방법원",
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_auction_03.pdf",
  },
  {
    rawText: "【갑구】 11. 임의경매개시결정 접수 2023년11월10일 제90909호\n인천지방법원 2023타경33445\n채권자 주식회사 신한은행\n청구금액 금320,000,000원\n이해관계인 전세권자 김나영",
    expectedOutput: {
      type: "임의경매개시결정",
      receptionDate: "2023-11-10",
      receptionNumber: "90909",
      court: "인천지방법원",
      caseNumber: "2023타경33445",
      creditor: "주식회사 신한은행",
      claimAmount: 320000000,
      interestedParty: "전세권자 김나영",
      auctionType: "임의경매",
    },
    category: "registry_갑구",
    confidence: 94,
    sourceFileName: "sample_auction_04.pdf",
  },
  {
    rawText: "【갑구】 12. 강제경매개시결정 접수 2024년5월5일 제01010호\n대전지방법원 2024타경55667\n채권자 국세청\n청구금액 금150,000,000원\n체납국세에 의한 공매",
    expectedOutput: {
      type: "강제경매개시결정",
      receptionDate: "2024-05-05",
      receptionNumber: "01010",
      court: "대전지방법원",
      caseNumber: "2024타경55667",
      creditor: "국세청",
      claimAmount: 150000000,
      auctionType: "강제경매",
      isPublicAuction: true,
    },
    category: "registry_갑구",
    confidence: 95,
    sourceFileName: "sample_auction_05.pdf",
  },
];

// ─── 표제부 (건물정보) 샘플 (6건) ───

const titleSamples: TrainingSample[] = [
  {
    rawText: "【표제부】 (건물의 표시)\n1. 소재지번: 서울특별시 강남구 역삼동 123-4\n건물명칭: 역삼타워\n구조: 철근콘크리트조\n용도: 업무시설\n면적: 1층 500.00㎡, 2층 480.50㎡\n총면적: 5,230.00㎡",
    expectedOutput: {
      type: "표제부",
      address: "서울특별시 강남구 역삼동 123-4",
      buildingName: "역삼타워",
      structure: "철근콘크리트조",
      usage: "업무시설",
      floors: [
        { floor: "1층", area: 500.0 },
        { floor: "2층", area: 480.5 },
      ],
      totalArea: 5230.0,
    },
    category: "registry_표제부",
    confidence: 96,
    sourceFileName: "sample_title_01.pdf",
  },
  {
    rawText: "【표제부】 (건물의 표시)\n1. 소재지번: 경기도 성남시 분당구 정자동 200\n건물명칭: 분당아이파크\n구조: 철근콘크리트조\n용도: 공동주택(아파트)\n대지면적: 15,000.00㎡\n연면적: 85,000.00㎡\n동수: 5개동\n세대수: 550세대",
    expectedOutput: {
      type: "표제부",
      address: "경기도 성남시 분당구 정자동 200",
      buildingName: "분당아이파크",
      structure: "철근콘크리트조",
      usage: "공동주택(아파트)",
      landArea: 15000.0,
      totalFloorArea: 85000.0,
      buildingCount: 5,
      unitCount: 550,
    },
    category: "registry_표제부",
    confidence: 95,
    sourceFileName: "sample_title_02.pdf",
  },
  {
    rawText: "【표제부】 (건물의 표시)\n1. 소재지번: 서울특별시 마포구 상암동 300-1\n구조: 일반목조\n용도: 단독주택\n면적: 1층 85.50㎡\n총면적: 85.50㎡\n건축년도: 1985년",
    expectedOutput: {
      type: "표제부",
      address: "서울특별시 마포구 상암동 300-1",
      structure: "일반목조",
      usage: "단독주택",
      floors: [{ floor: "1층", area: 85.5 }],
      totalArea: 85.5,
      buildYear: 1985,
    },
    category: "registry_표제부",
    confidence: 94,
    sourceFileName: "sample_title_03.pdf",
  },
  {
    rawText: "【표제부】 (전유부분의 건물의 표시)\n건물의 번호: 제301호\n구조: 철근콘크리트조\n면적: 84.98㎡ (전용면적)\n대지권의 종류: 소유권\n대지권비율: 15000분의 27.35",
    expectedOutput: {
      type: "표제부_전유부분",
      unitNumber: "제301호",
      structure: "철근콘크리트조",
      exclusiveArea: 84.98,
      landRightType: "소유권",
      landRightRatio: "15000분의 27.35",
    },
    category: "registry_표제부",
    confidence: 95,
    sourceFileName: "sample_title_04.pdf",
  },
  {
    rawText: "【표제부】 (건물의 표시)\n1. 소재지번: 인천광역시 연수구 송도동 100\n건물명칭: 송도 트리플스트리트\n구조: 철골철근콘크리트조\n용도: 제1종 근린생활시설, 판매시설\n면적: 지하1층 3,200.00㎡, 1층 2,800.00㎡, 2층 2,500.00㎡\n총면적: 8,500.00㎡",
    expectedOutput: {
      type: "표제부",
      address: "인천광역시 연수구 송도동 100",
      buildingName: "송도 트리플스트리트",
      structure: "철골철근콘크리트조",
      usage: ["제1종 근린생활시설", "판매시설"],
      floors: [
        { floor: "지하1층", area: 3200.0 },
        { floor: "1층", area: 2800.0 },
        { floor: "2층", area: 2500.0 },
      ],
      totalArea: 8500.0,
    },
    category: "registry_표제부",
    confidence: 93,
    sourceFileName: "sample_title_05.pdf",
  },
  {
    rawText: "【표제부】 (1동의 건물의 표시)\n건물명칭 및 번호: 제1동 101동\n구조: 철근콘크리트조\n용도: 공동주택(아파트)\n층수: 지하2층 지상25층\n호수: 150호\n건축년도: 2020년\n엘리베이터: 3대",
    expectedOutput: {
      type: "표제부_1동",
      buildingNumber: "제1동 101동",
      structure: "철근콘크리트조",
      usage: "공동주택(아파트)",
      undergroundFloors: 2,
      aboveGroundFloors: 25,
      unitCount: 150,
      buildYear: 2020,
      elevatorCount: 3,
    },
    category: "registry_표제부",
    confidence: 94,
    sourceFileName: "sample_title_06.pdf",
  },
];

// ─── 메인 시드 함수 ───

async function main() {
  console.log("등기부등본 학습 데이터 시드 시작...");

  const allSamples: TrainingSample[] = [
    ...mortgageSamples,
    ...ownershipSamples,
    ...seizureSamples,
    ...jeonseRightSamples,
    ...trustSamples,
    ...auctionSamples,
    ...titleSamples,
  ];

  console.log(`총 ${allSamples.length}건 시드 예정`);

  let created = 0;
  let skipped = 0;

  for (const sample of allSamples) {
    const rawTextHash = sha256(sample.rawText);

    // 중복 확인
    const existing = await prisma.trainingData.findUnique({
      where: { rawTextHash },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // 갑구/을구 항목 수 계산
    const gapguCount = (sample.rawText.match(/【갑구】/g) || []).length;
    const eulguCount = (sample.rawText.match(/【을구】/g) || []).length;

    await prisma.trainingData.create({
      data: {
        rawTextEncrypted: encryptText(sample.rawText),
        rawTextHash,
        parsedData: sample.expectedOutput as unknown as import("@prisma/client").Prisma.InputJsonValue,
        status: "approved",
        reviewNotes: `시드 데이터: ${sample.category}`,
        sourceFileName: sample.sourceFileName,
        sourceType: "text",
        confidence: sample.confidence,
        charCount: sample.rawText.length,
        gapguCount,
        eulguCount,
      },
    });

    created++;
  }

  console.log(`완료: ${created}건 생성, ${skipped}건 중복 건너뜀`);
  console.log(`카테고리별 분포:`);
  console.log(`  - 근저당권 설정: ${mortgageSamples.length}건`);
  console.log(`  - 소유권 이전: ${ownershipSamples.length}건`);
  console.log(`  - 가압류/가처분: ${seizureSamples.length}건`);
  console.log(`  - 전세권 설정: ${jeonseRightSamples.length}건`);
  console.log(`  - 신탁 등기: ${trustSamples.length}건`);
  console.log(`  - 경매개시결정: ${auctionSamples.length}건`);
  console.log(`  - 표제부: ${titleSamples.length}건`);
}

main()
  .catch((e) => {
    console.error("시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
