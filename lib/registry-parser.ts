/**
 * VESTRA 등기부등본 자동 파싱 엔진
 * ─────────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 정규식 패턴 매칭 + 키워드 분류로 등기부등본 원문을 구조화된 데이터로 변환.
 *
 * 지원 형식: 인터넷등기소 텍스트, 법원등기 텍스트, OCR 추출 텍스트
 */

// ─── 타입 정의 ───

export interface TitleSection {
  address: string;
  buildingDetail: string;
  area: string;
  structure: string;
  purpose: string;
  landRightRatio: string;
  /** 집합건물 (아파트) 추가 필드 */
  buildingName: string;
  unitNumber: string;
  exclusiveArea: string;
  totalFloors: string;
  isApartment: boolean;
}

export interface GapguEntry {
  order: number;
  date: string;
  purpose: string;
  detail: string;
  holder: string;
  isCancelled: boolean;
  riskType: RiskType;
}

export interface EulguEntry {
  order: number;
  date: string;
  purpose: string;
  detail: string;
  amount: number;
  holder: string;
  isCancelled: boolean;
  riskType: RiskType;
}

export type RiskType = "danger" | "warning" | "safe" | "info";

export interface ParseSummary {
  totalGapguEntries: number;
  totalEulguEntries: number;
  activeGapguEntries: number;
  activeEulguEntries: number;
  cancelledEntries: number;
  totalMortgageAmount: number;
  totalJeonseAmount: number;
  hasSeizure: boolean;
  hasProvisionalSeizure: boolean;
  hasProvisionalDisposition: boolean;
  hasAuctionOrder: boolean;
  hasTrust: boolean;
  hasProvisionalRegistration: boolean;
  hasLeaseRegistration: boolean;
  hasWarningRegistration: boolean;
  hasRedemptionRegistration: boolean;
  ownershipTransferCount: number;
  totalClaimsAmount: number;
}

export interface ParsedRegistry {
  title: TitleSection;
  gapgu: GapguEntry[];
  eulgu: EulguEntry[];
  summary: ParseSummary;
  rawText: string;
}

// ─── 분리 모듈 import ───

import { splitSections, normalizeRegistryNewlines } from "./registry/parsing-utils";
import { parseTitle, parseGapgu, parseEulgu, resolveCancellations, buildSummary } from "./registry/section-parsers";

// ─── re-export (기존 import 경로 유지) ───

export {
  GAPGU_RISK_MAP, EULGU_RISK_MAP,
  extractDate, extractAmount, classifyRightType,
  isCancelled, isRefCancellation, compressFloorData, extractArea, extractHolder,
  splitSections, normalizeRegistryNewlines,
} from "./registry/parsing-utils";

export type { RawSections } from "./registry/parsing-utils";

export {
  parseTitle, parseGapgu, parseEulgu, resolveCancellations, buildSummary,
} from "./registry/section-parsers";

// ─── 메인 파싱 함수 ───

export function parseRegistry(rawText: string): ParsedRegistry {
  const normalized = normalizeRegistryNewlines(rawText);
  const { titleRaw, gapguRaw, eulguRaw } = splitSections(normalized);

  const title = parseTitle(titleRaw);
  const gapgu = resolveCancellations(parseGapgu(gapguRaw));
  const eulgu = resolveCancellations(parseEulgu(eulguRaw));
  const summary = buildSummary(gapgu, eulgu);

  return {
    title, gapgu, eulgu, summary, rawText,
  };
}

// ─── 샘플 데이터 (테스트/데모용) ───

export const SAMPLE_REGISTRY_TEXT = `
──────────────────────────────────────────────────────
                    등 기 부 등 본 (건물)
                    고유번호: 1101-2024-012345
──────────────────────────────────────────────────────

【 표 제 부 】 (건물의 표시)

 표시번호 |  접  수  |     소재지번 및 건물번호     |        건물내역        | 등기원인 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     2019년3월15일  서울특별시 강남구 역삼동      철근콘크리트조           [대지권의 목적인 토지의 표시]
                        123-45 래미안레벤투스         지붕슬래브방수           서울특별시 강남구 역삼동
                        제101동 제15층 제1502호       아파트                   123-45
                                                     84.97㎡                  대지권비율 52718.4분의 84.97

【 갑 구 】 (소유권에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     소유권보존   2019년3월20일    2019년3월15일        소유자 대한건설주식회사
                      제12345호        보존등기              110111-0012345

    2     소유권이전   2019년8월10일    2019년8월5일         소유자 김영수
                      제23456호        매매                  850101-1234567
                                                            서울특별시 강남구 역삼로 123

    3     소유권이전   2022년5월20일    2022년5월15일        소유자 박지민
                      제34567호        매매                  900215-2345678
                                                            서울특별시 서초구 서초대로 456

    4     가압류      2024년8월15일    2024년8월14일         채권자 이상호
                      제45678호        서울중앙지방법원       청구금액 금 150,000,000원
                                      2024카단12345

    5     소유권이전   2025년1월10일    2025년1월8일         소유자 최현우
                      제56789호        매매                  880320-1456789
                                                            서울특별시 강남구 테헤란로 789
          가압류말소   2025년1월10일    해제
                      제56790호

【 을 구 】 (소유권 이외의 권리에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     근저당권설정  2019년8월12일   2019년8월10일         채권최고액 금 480,000,000원
                      제23460호        설정계약              근저당권자 국민은행
                                                            채무자 김영수

    2     근저당권설정  2022년5월25일   2022년5월20일         채권최고액 금 360,000,000원
                      제34570호        설정계약              근저당권자 신한은행
                                                            채무자 박지민
          1번근저당권말소 2022년5월25일  해제
                      제34571호

    3     전세권설정   2023년3월10일    2023년3월8일          전세금 금 550,000,000원
                      제40001호        설정계약              전세권자 정민수
                                                            범위: 건물전부
                                                            존속기간: 2023년3월10일부터 2025년3월9일까지

    4     근저당권설정  2025년1월15일   2025년1월10일         채권최고액 금 540,000,000원
                      제56800호        설정계약              근저당권자 하나은행
                                                            채무자 최현우
          2번근저당권말소 2025년1월15일  해제
                      제56801호
`.trim();
