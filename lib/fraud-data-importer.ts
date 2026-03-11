/**
 * VESTRA 전세사기 피해사례 데이터 임포터
 * ───────────────────────────────────────
 * 초기 시드 데이터 및 외부 소스로부터 FraudCase를 DB에 적재.
 */

import { prisma } from "./prisma";

// ─── 타입 ───

export interface FraudCaseInput {
  address: string;
  lat: number;
  lng: number;
  caseType: string;
  amount?: number;
  victimCount?: number;
  occurredAt?: string;
  source?: string;
  summary?: string;
}

// ─── 시드 데이터 ───

export const SEED_FRAUD_CASES: FraudCaseInput[] = [
  // 서울 주요 피해 지역
  { address: "서울시 강서구 화곡동", lat: 37.5509, lng: 126.8496, caseType: "깡통전세", amount: 3_200_000_000, victimCount: 15, source: "뉴스종합", summary: "빌라 다주택 깡통전세 사기" },
  { address: "서울시 관악구 신림동", lat: 37.4874, lng: 126.9290, caseType: "이중계약", amount: 1_500_000_000, victimCount: 8, source: "뉴스종합", summary: "원룸 이중계약 전세사기" },
  { address: "서울시 동작구 상도동", lat: 37.4983, lng: 126.9528, caseType: "깡통전세", amount: 2_100_000_000, victimCount: 12, source: "뉴스종합", summary: "신축빌라 과다대출 전세사기" },
  { address: "서울시 금천구 가산동", lat: 37.4777, lng: 126.8875, caseType: "보증금미반환", amount: 800_000_000, victimCount: 5, source: "뉴스종합", summary: "오피스텔 보증금 미반환" },
  { address: "서울시 강북구 수유동", lat: 37.6396, lng: 127.0257, caseType: "깡통전세", amount: 1_800_000_000, victimCount: 10, source: "뉴스종합", summary: "다세대 깡통전세" },
  { address: "서울시 노원구 상계동", lat: 37.6547, lng: 127.0678, caseType: "보증금미반환", amount: 950_000_000, victimCount: 6, source: "뉴스종합", summary: "임대인 파산으로 보증금 미반환" },

  // 인천
  { address: "인천시 미추홀구 주안동", lat: 37.4489, lng: 126.6834, caseType: "깡통전세", amount: 5_600_000_000, victimCount: 32, source: "뉴스종합", summary: "대규모 빌라 전세사기" },
  { address: "인천시 부평구 부평동", lat: 37.5074, lng: 126.7218, caseType: "이중계약", amount: 2_300_000_000, victimCount: 14, source: "뉴스종합", summary: "신축빌라 이중계약" },
  { address: "인천시 남동구 간석동", lat: 37.4417, lng: 126.7225, caseType: "깡통전세", amount: 3_800_000_000, victimCount: 20, source: "뉴스종합", summary: "집단 깡통전세 피해" },

  // 경기
  { address: "화성시 동탄2신도시", lat: 37.2000, lng: 127.0650, caseType: "깡통전세", amount: 4_200_000_000, victimCount: 25, source: "뉴스종합", summary: "신도시 오피스텔 전세사기" },
  { address: "수원시 영통구 망포동", lat: 37.2455, lng: 127.0561, caseType: "보증금미반환", amount: 1_200_000_000, victimCount: 7, source: "뉴스종합", summary: "원룸촌 보증금 미반환" },
  { address: "평택시 고덕면", lat: 36.9920, lng: 127.1050, caseType: "깡통전세", amount: 2_800_000_000, victimCount: 18, source: "뉴스종합", summary: "고덕 신도시 전세사기" },

  // 대전/세종
  { address: "대전시 유성구 도룡동", lat: 36.3625, lng: 127.3780, caseType: "깡통전세", amount: 1_600_000_000, victimCount: 9, source: "뉴스종합", summary: "빌라 깡통전세" },
  { address: "세종시 새롬동", lat: 36.5004, lng: 127.0000, caseType: "보증금미반환", amount: 700_000_000, victimCount: 4, source: "뉴스종합", summary: "아파트 보증금 미반환" },

  // 부산
  { address: "부산시 해운대구 좌동", lat: 35.1647, lng: 129.1733, caseType: "깡통전세", amount: 2_500_000_000, victimCount: 13, source: "뉴스종합", summary: "오피스텔 전세사기" },
  { address: "부산시 부산진구 부전동", lat: 35.1579, lng: 129.0569, caseType: "이중계약", amount: 900_000_000, victimCount: 5, source: "뉴스종합", summary: "원룸 이중계약 사기" },
];

// ─── 임포트 함수 ───

/**
 * 시드 데이터를 DB에 적재 (중복 방지: 주소 기준)
 */
export async function importSeedData(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const c of SEED_FRAUD_CASES) {
    const existing = await prisma.fraudCase.findFirst({
      where: { address: c.address, caseType: c.caseType },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.fraudCase.create({
      data: {
        address: c.address,
        latitude: c.lat,
        longitude: c.lng,
        caseType: c.caseType,
        amount: c.amount || null,
        victimCount: c.victimCount || null,
        reportDate: c.occurredAt ? new Date(c.occurredAt) : null,
        source: c.source || "seed",
        summary: c.summary || null,
        verified: true,
      },
    });
    imported++;
  }

  return { imported, skipped };
}

/**
 * 외부 소스에서 데이터 가져오기 (향후 공공데이터 API 연동용)
 */
export async function importFromExternalSource(): Promise<{
  imported: number;
  errors: string[];
}> {
  // TODO: 공공데이터포털, 뉴스 크롤링, 법원 경매 데이터 등 연동
  // 현재는 시드 데이터만 사용
  const result = await importSeedData();
  return {
    imported: result.imported,
    errors: [],
  };
}
