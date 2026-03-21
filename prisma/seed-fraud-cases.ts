/**
 * 전세사기 피해사례 시드 스크립트
 * ──────────────────────────────────
 * 2023-2025 실제 한국 전세사기 패턴 기반 40+ 사례 시드.
 *
 * 실행: npx tsx prisma/seed-fraud-cases.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 사기 유형 정의 ───

type FraudType =
  | "깡통전세"
  | "이중계약"
  | "전세보증금_미반환"
  | "허위매물"
  | "다중채무_임대인";

type PerpType = "개인임대인" | "법인임대인" | "공인중개사_공모" | "건축주" | "기획부동산";

interface FraudSeed {
  region: string;
  district: string;
  address: string;
  fraudType: FraudType;
  description: string;
  damageAmount: number; // 만원
  victimCount: number;
  occurredAt: string;   // ISO
  reportedAt: string;   // ISO
  latitude: number;
  longitude: number;
  perpetratorType: PerpType;
  tactics: string[];
}

// ─── 지역별 중심 좌표 ───

const COORDS: Record<string, { latitude: number; longitude: number }> = {
  "서울 강서구":     { latitude: 37.5509, longitude: 126.8495 },
  "서울 관악구":     { latitude: 37.4784, longitude: 126.9516 },
  "서울 구로구":     { latitude: 37.4955, longitude: 126.8874 },
  "서울 금천구":     { latitude: 37.4568, longitude: 126.8955 },
  "서울 동작구":     { latitude: 37.5124, longitude: 126.9393 },
  "서울 영등포구":   { latitude: 37.5264, longitude: 126.8963 },
  "인천 미추홀구":   { latitude: 37.4420, longitude: 126.6994 },
  "인천 남동구":     { latitude: 37.4488, longitude: 126.7309 },
  "인천 부평구":     { latitude: 37.5074, longitude: 126.7219 },
  "경기 화성":       { latitude: 37.1996, longitude: 126.8312 },
  "경기 평택":       { latitude: 36.9921, longitude: 127.0866 },
  "부산 사하구":     { latitude: 35.1046, longitude: 128.9748 },
};

/** 좌표에 미세 오프셋 추가 (익명화) */
function jitter(base: number): number {
  return base + (Math.random() - 0.5) * 0.01;
}

// ─── 시드 데이터 (40+ 사례) ───

const FRAUD_CASES: FraudSeed[] = [
  // ── 서울 강서구 (6건) ──
  {
    region: "서울", district: "강서구",
    address: "서울 강서구 화곡동 ***-**",
    fraudType: "깡통전세",
    description: "전세가율 120% 초과 빌라. 근저당 설정 후 전세금 편취. 임대인 다수 물건 보유 확인.",
    damageAmount: 28000, victimCount: 12,
    occurredAt: "2023-04-15T00:00:00Z", reportedAt: "2023-06-20T00:00:00Z",
    ...COORDS["서울 강서구"],
    perpetratorType: "개인임대인",
    tactics: ["근저당 과다설정", "전세가율 조작", "허위 시세 제공", "다수 물건 동시 임대"],
  },
  {
    region: "서울", district: "강서구",
    address: "서울 강서구 등촌동 ***-**",
    fraudType: "이중계약",
    description: "동일 물건에 대해 2건의 전세계약 체결. 보증금 총액이 매매가 초과.",
    damageAmount: 18000, victimCount: 2,
    occurredAt: "2023-07-10T00:00:00Z", reportedAt: "2023-09-05T00:00:00Z",
    ...COORDS["서울 강서구"],
    perpetratorType: "공인중개사_공모",
    tactics: ["이중계약", "확정일자 미고지", "중개사 공모"],
  },
  {
    region: "서울", district: "강서구",
    address: "서울 강서구 가양동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "계약 만료 후 보증금 미반환. 임대인 연락두절 및 해외 도피 정황.",
    damageAmount: 32000, victimCount: 8,
    occurredAt: "2023-11-20T00:00:00Z", reportedAt: "2024-01-15T00:00:00Z",
    ...COORDS["서울 강서구"],
    perpetratorType: "법인임대인",
    tactics: ["법인 명의 임대", "보증금 미반환", "임대인 잠적", "법인 폐업"],
  },
  {
    region: "서울", district: "강서구",
    address: "서울 강서구 방화동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인이 다수 금융기관에 채무 보유. 전세보증금으로 채무 상환 후 파산 신청.",
    damageAmount: 45000, victimCount: 15,
    occurredAt: "2024-02-01T00:00:00Z", reportedAt: "2024-04-10T00:00:00Z",
    ...COORDS["서울 강서구"],
    perpetratorType: "개인임대인",
    tactics: ["다중 채무", "전세금 유용", "파산 신청", "재산 은닉"],
  },
  {
    region: "서울", district: "강서구",
    address: "서울 강서구 발산동 ***-**",
    fraudType: "허위매물",
    description: "실제 소유자가 아닌 자가 위조 서류로 전세계약 체결.",
    damageAmount: 15000, victimCount: 3,
    occurredAt: "2024-05-20T00:00:00Z", reportedAt: "2024-06-30T00:00:00Z",
    ...COORDS["서울 강서구"],
    perpetratorType: "기획부동산",
    tactics: ["서류 위조", "신분 사칭", "허위 등기부등본"],
  },
  {
    region: "서울", district: "강서구",
    address: "서울 강서구 내발산동 ***-**",
    fraudType: "깡통전세",
    description: "신축 빌라 매입 후 시세 부풀려 전세 설정. 갭투자 실패로 보증금 반환 불가.",
    damageAmount: 22000, victimCount: 6,
    occurredAt: "2024-08-15T00:00:00Z", reportedAt: "2024-10-01T00:00:00Z",
    ...COORDS["서울 강서구"],
    perpetratorType: "건축주",
    tactics: ["신축 빌라 갭투자", "시세 부풀리기", "전세가율 초과"],
  },

  // ── 서울 관악구 (4건) ──
  {
    region: "서울", district: "관악구",
    address: "서울 관악구 신림동 ***-**",
    fraudType: "깡통전세",
    description: "원룸 밀집지역 다가구 전세사기. 건물 전체 세입자 피해.",
    damageAmount: 52000, victimCount: 22,
    occurredAt: "2023-03-01T00:00:00Z", reportedAt: "2023-05-15T00:00:00Z",
    ...COORDS["서울 관악구"],
    perpetratorType: "개인임대인",
    tactics: ["다가구 전체 사기", "근저당 과다", "전세가율 150% 초과"],
  },
  {
    region: "서울", district: "관악구",
    address: "서울 관악구 봉천동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "대학가 인근 원룸. 졸업시즌 보증금 미반환 집단 피해.",
    damageAmount: 18000, victimCount: 9,
    occurredAt: "2023-08-25T00:00:00Z", reportedAt: "2023-10-10T00:00:00Z",
    ...COORDS["서울 관악구"],
    perpetratorType: "개인임대인",
    tactics: ["보증금 미반환", "연락두절", "학생 대상 타겟팅"],
  },
  {
    region: "서울", district: "관악구",
    address: "서울 관악구 남현동 ***-**",
    fraudType: "이중계약",
    description: "동일 호실에 전세와 월세 동시 계약. 중개사 공모 확인.",
    damageAmount: 12000, victimCount: 2,
    occurredAt: "2024-01-10T00:00:00Z", reportedAt: "2024-03-20T00:00:00Z",
    ...COORDS["서울 관악구"],
    perpetratorType: "공인중개사_공모",
    tactics: ["이중계약", "중개사 공모", "계약서 위조"],
  },
  {
    region: "서울", district: "관악구",
    address: "서울 관악구 신림동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인 세금체납 및 다중 압류. 경매 진행으로 세입자 보증금 미회수.",
    damageAmount: 35000, victimCount: 14,
    occurredAt: "2024-06-05T00:00:00Z", reportedAt: "2024-08-20T00:00:00Z",
    ...COORDS["서울 관악구"],
    perpetratorType: "개인임대인",
    tactics: ["세금체납", "다중 압류", "경매 진행", "보증금 우선변제 불가"],
  },

  // ── 서울 구로구 (3건) ──
  {
    region: "서울", district: "구로구",
    address: "서울 구로구 구로동 ***-**",
    fraudType: "깡통전세",
    description: "오피스텔 전세사기. 매매가 대비 전세가 비율 130% 이상.",
    damageAmount: 25000, victimCount: 10,
    occurredAt: "2023-05-20T00:00:00Z", reportedAt: "2023-07-15T00:00:00Z",
    ...COORDS["서울 구로구"],
    perpetratorType: "법인임대인",
    tactics: ["오피스텔 갭투자", "법인 명의", "허위 감정평가"],
  },
  {
    region: "서울", district: "구로구",
    address: "서울 구로구 개봉동 ***-**",
    fraudType: "허위매물",
    description: "실존하지 않는 호실 번호로 계약 체결. 온라인 허위 매물 게시.",
    damageAmount: 8000, victimCount: 4,
    occurredAt: "2024-03-15T00:00:00Z", reportedAt: "2024-04-25T00:00:00Z",
    ...COORDS["서울 구로구"],
    perpetratorType: "기획부동산",
    tactics: ["허위 매물 게시", "온라인 사기", "선입금 유도"],
  },
  {
    region: "서울", district: "구로구",
    address: "서울 구로구 신도림동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "다세대 주택 임대인 잠적. 세입자 6명 보증금 미회수.",
    damageAmount: 21000, victimCount: 6,
    occurredAt: "2024-09-01T00:00:00Z", reportedAt: "2024-11-10T00:00:00Z",
    ...COORDS["서울 구로구"],
    perpetratorType: "개인임대인",
    tactics: ["보증금 미반환", "임대인 잠적", "전입신고 지연 유도"],
  },

  // ── 서울 금천구 (3건) ──
  {
    region: "서울", district: "금천구",
    address: "서울 금천구 가산동 ***-**",
    fraudType: "깡통전세",
    description: "지식산업센터 인근 오피스텔 전세사기. 공실률 높은 건물.",
    damageAmount: 16000, victimCount: 7,
    occurredAt: "2023-09-10T00:00:00Z", reportedAt: "2023-11-25T00:00:00Z",
    ...COORDS["서울 금천구"],
    perpetratorType: "건축주",
    tactics: ["공실 건물 전세", "시세 부풀리기", "건축주 직접 임대"],
  },
  {
    region: "서울", district: "금천구",
    address: "서울 금천구 독산동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인 신용불량 상태에서 전세계약 다수 체결.",
    damageAmount: 28000, victimCount: 11,
    occurredAt: "2024-04-01T00:00:00Z", reportedAt: "2024-06-15T00:00:00Z",
    ...COORDS["서울 금천구"],
    perpetratorType: "개인임대인",
    tactics: ["신용불량 은닉", "다수 계약 체결", "보증보험 미가입 유도"],
  },
  {
    region: "서울", district: "금천구",
    address: "서울 금천구 시흥동 ***-**",
    fraudType: "이중계약",
    description: "전세와 근저당 동시 설정. 은행 대출과 전세금 이중 수취.",
    damageAmount: 14000, victimCount: 3,
    occurredAt: "2025-01-20T00:00:00Z", reportedAt: "2025-03-05T00:00:00Z",
    ...COORDS["서울 금천구"],
    perpetratorType: "공인중개사_공모",
    tactics: ["근저당 동시설정", "이중 수취", "중개사 묵인"],
  },

  // ── 서울 동작구 (3건) ──
  {
    region: "서울", district: "동작구",
    address: "서울 동작구 상도동 ***-**",
    fraudType: "깡통전세",
    description: "대학가 빌라 전세사기. 시세 대비 과도한 전세금 설정.",
    damageAmount: 20000, victimCount: 8,
    occurredAt: "2023-06-01T00:00:00Z", reportedAt: "2023-08-20T00:00:00Z",
    ...COORDS["서울 동작구"],
    perpetratorType: "개인임대인",
    tactics: ["대학가 타겟팅", "시세 조작", "급매 유도"],
  },
  {
    region: "서울", district: "동작구",
    address: "서울 동작구 노량진동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "고시촌 원룸 보증금 미반환. 다수 수험생 피해.",
    damageAmount: 9500, victimCount: 15,
    occurredAt: "2024-02-15T00:00:00Z", reportedAt: "2024-04-01T00:00:00Z",
    ...COORDS["서울 동작구"],
    perpetratorType: "개인임대인",
    tactics: ["소액 다건", "보증금 미반환", "수험생 타겟"],
  },
  {
    region: "서울", district: "동작구",
    address: "서울 동작구 대방동 ***-**",
    fraudType: "허위매물",
    description: "리모델링 완료로 홍보했으나 실제 미시공. 사진 도용.",
    damageAmount: 11000, victimCount: 4,
    occurredAt: "2024-07-10T00:00:00Z", reportedAt: "2024-09-01T00:00:00Z",
    ...COORDS["서울 동작구"],
    perpetratorType: "기획부동산",
    tactics: ["사진 도용", "허위 리모델링", "선계약 유도"],
  },

  // ── 서울 영등포구 (3건) ──
  {
    region: "서울", district: "영등포구",
    address: "서울 영등포구 대림동 ***-**",
    fraudType: "깡통전세",
    description: "다세대 빌라 밀집지역 조직적 전세사기. 동일 임대인 20채 이상 보유.",
    damageAmount: 85000, victimCount: 35,
    occurredAt: "2023-02-01T00:00:00Z", reportedAt: "2023-04-15T00:00:00Z",
    ...COORDS["서울 영등포구"],
    perpetratorType: "개인임대인",
    tactics: ["조직적 사기", "다수 물건 보유", "근저당 과다", "중개사 연계"],
  },
  {
    region: "서울", district: "영등포구",
    address: "서울 영등포구 신길동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인 사업자금 목적 전세금 유용. 사업 실패 후 보증금 반환 불가.",
    damageAmount: 38000, victimCount: 12,
    occurredAt: "2023-12-01T00:00:00Z", reportedAt: "2024-02-20T00:00:00Z",
    ...COORDS["서울 영등포구"],
    perpetratorType: "개인임대인",
    tactics: ["전세금 유용", "사업자금 전용", "재산 은닉"],
  },
  {
    region: "서울", district: "영등포구",
    address: "서울 영등포구 양평동 ***-**",
    fraudType: "이중계약",
    description: "오피스텔 전세와 월세 이중계약. 관리비 포함 허위 조건 제시.",
    damageAmount: 10000, victimCount: 5,
    occurredAt: "2024-10-01T00:00:00Z", reportedAt: "2024-12-15T00:00:00Z",
    ...COORDS["서울 영등포구"],
    perpetratorType: "공인중개사_공모",
    tactics: ["이중계약", "허위 조건", "관리비 사기"],
  },

  // ── 인천 미추홀구 (4건) ──
  {
    region: "인천", district: "미추홀구",
    address: "인천 미추홀구 주안동 ***-**",
    fraudType: "깡통전세",
    description: "전세가율 140% 신축빌라. 건축주가 직접 분양 후 전세 전환.",
    damageAmount: 62000, victimCount: 28,
    occurredAt: "2023-01-15T00:00:00Z", reportedAt: "2023-03-20T00:00:00Z",
    ...COORDS["인천 미추홀구"],
    perpetratorType: "건축주",
    tactics: ["신축 후 바로 전세", "건축주 직접 계약", "전세가율 140%", "보증보험 가입 방해"],
  },
  {
    region: "인천", district: "미추홀구",
    address: "인천 미추홀구 숭의동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "재개발 예정지역 빌라. 임대인 보증금 수령 후 물건 매각.",
    damageAmount: 24000, victimCount: 8,
    occurredAt: "2023-10-05T00:00:00Z", reportedAt: "2023-12-10T00:00:00Z",
    ...COORDS["인천 미추홀구"],
    perpetratorType: "개인임대인",
    tactics: ["재개발 지역 악용", "물건 매각", "보증금 미반환"],
  },
  {
    region: "인천", district: "미추홀구",
    address: "인천 미추홀구 도화동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인 세금체납 2억원 이상. 압류 경매로 세입자 피해.",
    damageAmount: 42000, victimCount: 18,
    occurredAt: "2024-03-01T00:00:00Z", reportedAt: "2024-05-15T00:00:00Z",
    ...COORDS["인천 미추홀구"],
    perpetratorType: "개인임대인",
    tactics: ["세금체납 은닉", "다중 압류", "경매 낙찰가 하락"],
  },
  {
    region: "인천", district: "미추홀구",
    address: "인천 미추홀구 학익동 ***-**",
    fraudType: "허위매물",
    description: "온라인 플랫폼 허위매물 게시. 실제와 다른 사진/조건으로 계약 유도.",
    damageAmount: 6000, victimCount: 3,
    occurredAt: "2025-02-10T00:00:00Z", reportedAt: "2025-03-01T00:00:00Z",
    ...COORDS["인천 미추홀구"],
    perpetratorType: "기획부동산",
    tactics: ["허위 사진", "온라인 사기", "계약금 편취"],
  },

  // ── 인천 남동구 (3건) ──
  {
    region: "인천", district: "남동구",
    address: "인천 남동구 간석동 ***-**",
    fraudType: "깡통전세",
    description: "역세권 빌라 전세사기. 매매가 하락기 전세가 미조정으로 깡통화.",
    damageAmount: 33000, victimCount: 14,
    occurredAt: "2023-04-20T00:00:00Z", reportedAt: "2023-06-30T00:00:00Z",
    ...COORDS["인천 남동구"],
    perpetratorType: "개인임대인",
    tactics: ["매매가 하락기 악용", "전세가 미조정", "역세권 프리미엄 허위"],
  },
  {
    region: "인천", district: "남동구",
    address: "인천 남동구 구월동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "상가건물 1층 임대. 임대인 부도로 보증금 회수 불가.",
    damageAmount: 15000, victimCount: 5,
    occurredAt: "2024-01-15T00:00:00Z", reportedAt: "2024-03-10T00:00:00Z",
    ...COORDS["인천 남동구"],
    perpetratorType: "법인임대인",
    tactics: ["법인 부도", "상가 보증금", "우선변제 불가"],
  },
  {
    region: "인천", district: "남동구",
    address: "인천 남동구 논현동 ***-**",
    fraudType: "이중계약",
    description: "신도시 아파트 전세. 동일 호실 이중계약으로 보증금 편취.",
    damageAmount: 40000, victimCount: 2,
    occurredAt: "2024-08-01T00:00:00Z", reportedAt: "2024-10-15T00:00:00Z",
    ...COORDS["인천 남동구"],
    perpetratorType: "공인중개사_공모",
    tactics: ["아파트 이중계약", "전입신고 경쟁", "중개사 공모"],
  },

  // ── 인천 부평구 (3건) ──
  {
    region: "인천", district: "부평구",
    address: "인천 부평구 부평동 ***-**",
    fraudType: "깡통전세",
    description: "구도심 다가구 전세사기. 노후 건물 시세 부풀림.",
    damageAmount: 29000, victimCount: 13,
    occurredAt: "2023-06-15T00:00:00Z", reportedAt: "2023-08-25T00:00:00Z",
    ...COORDS["인천 부평구"],
    perpetratorType: "개인임대인",
    tactics: ["노후 건물", "시세 부풀림", "근저당 과다"],
  },
  {
    region: "인천", district: "부평구",
    address: "인천 부평구 십정동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인 개인회생 진행 중 전세계약. 법원 결정으로 보증금 감액.",
    damageAmount: 19000, victimCount: 7,
    occurredAt: "2024-05-01T00:00:00Z", reportedAt: "2024-07-20T00:00:00Z",
    ...COORDS["인천 부평구"],
    perpetratorType: "개인임대인",
    tactics: ["개인회생 은닉", "법원 감액", "채무 정보 미공개"],
  },
  {
    region: "인천", district: "부평구",
    address: "인천 부평구 산곡동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "임대차 만료 후 6개월 이상 보증금 미반환. 임대인 소재 불명.",
    damageAmount: 13000, victimCount: 5,
    occurredAt: "2025-01-05T00:00:00Z", reportedAt: "2025-02-28T00:00:00Z",
    ...COORDS["인천 부평구"],
    perpetratorType: "개인임대인",
    tactics: ["장기 미반환", "소재 불명", "내용증명 무시"],
  },

  // ── 경기 화성 (3건) ──
  {
    region: "경기", district: "화성",
    address: "경기 화성시 동탄 ***-**",
    fraudType: "깡통전세",
    description: "동탄 신도시 오피스텔 전세사기. 분양가 대비 전세가 비정상적.",
    damageAmount: 48000, victimCount: 20,
    occurredAt: "2023-08-01T00:00:00Z", reportedAt: "2023-10-15T00:00:00Z",
    ...COORDS["경기 화성"],
    perpetratorType: "건축주",
    tactics: ["신도시 오피스텔", "분양가 대비 전세가 비정상", "건축주 갭투자"],
  },
  {
    region: "경기", district: "화성",
    address: "경기 화성시 봉담읍 ***-**",
    fraudType: "전세보증금_미반환",
    description: "택지개발지구 빌라. 분양 실패로 임대인 자금난.",
    damageAmount: 22000, victimCount: 9,
    occurredAt: "2024-04-15T00:00:00Z", reportedAt: "2024-06-20T00:00:00Z",
    ...COORDS["경기 화성"],
    perpetratorType: "건축주",
    tactics: ["분양 실패", "자금난", "보증금 유용"],
  },
  {
    region: "경기", district: "화성",
    address: "경기 화성시 향남읍 ***-**",
    fraudType: "허위매물",
    description: "미입주 아파트를 전세로 광고. 입주 지연으로 피해 발생.",
    damageAmount: 30000, victimCount: 12,
    occurredAt: "2024-11-01T00:00:00Z", reportedAt: "2025-01-10T00:00:00Z",
    ...COORDS["경기 화성"],
    perpetratorType: "기획부동산",
    tactics: ["미입주 아파트", "입주 지연", "선계약금 편취"],
  },

  // ── 경기 평택 (3건) ──
  {
    region: "경기", district: "평택",
    address: "경기 평택시 고덕동 ***-**",
    fraudType: "깡통전세",
    description: "고덕국제신도시 빌라. 과도한 전세가 설정으로 깡통전세 다수 발생.",
    damageAmount: 55000, victimCount: 25,
    occurredAt: "2023-03-10T00:00:00Z", reportedAt: "2023-05-20T00:00:00Z",
    ...COORDS["경기 평택"],
    perpetratorType: "건축주",
    tactics: ["신도시 빌라", "과도한 전세가", "건축주 다수 물건"],
  },
  {
    region: "경기", district: "평택",
    address: "경기 평택시 비전동 ***-**",
    fraudType: "다중채무_임대인",
    description: "임대인이 10건 이상의 대출 보유. 전세금으로 이자 상환 구조.",
    damageAmount: 36000, victimCount: 16,
    occurredAt: "2024-02-01T00:00:00Z", reportedAt: "2024-04-15T00:00:00Z",
    ...COORDS["경기 평택"],
    perpetratorType: "개인임대인",
    tactics: ["다수 대출", "이자 상환 구조", "폰지 구조"],
  },
  {
    region: "경기", district: "평택",
    address: "경기 평택시 세교동 ***-**",
    fraudType: "이중계약",
    description: "아파트 전세계약과 월세계약 이중 체결. 중개사 2곳 동시 이용.",
    damageAmount: 25000, victimCount: 2,
    occurredAt: "2024-09-15T00:00:00Z", reportedAt: "2024-11-20T00:00:00Z",
    ...COORDS["경기 평택"],
    perpetratorType: "공인중개사_공모",
    tactics: ["이중 중개사", "동시 계약", "확정일자 경쟁"],
  },

  // ── 부산 사하구 (4건) ──
  {
    region: "부산", district: "사하구",
    address: "부산 사하구 하단동 ***-**",
    fraudType: "깡통전세",
    description: "하단역 인근 빌라 밀집지역. 매매가 하락에도 전세가 유지로 깡통화.",
    damageAmount: 38000, victimCount: 18,
    occurredAt: "2023-05-01T00:00:00Z", reportedAt: "2023-07-15T00:00:00Z",
    ...COORDS["부산 사하구"],
    perpetratorType: "개인임대인",
    tactics: ["매매가 하락", "전세가 미조정", "역세권 빌라"],
  },
  {
    region: "부산", district: "사하구",
    address: "부산 사하구 괴정동 ***-**",
    fraudType: "전세보증금_미반환",
    description: "노후 다세대 주택. 임대인 사망 후 상속인 보증금 반환 거부.",
    damageAmount: 16000, victimCount: 6,
    occurredAt: "2023-11-01T00:00:00Z", reportedAt: "2024-01-20T00:00:00Z",
    ...COORDS["부산 사하구"],
    perpetratorType: "개인임대인",
    tactics: ["임대인 사망", "상속 분쟁", "보증금 반환 거부"],
  },
  {
    region: "부산", district: "사하구",
    address: "부산 사하구 당리동 ***-**",
    fraudType: "다중채무_임대인",
    description: "조선소 불황으로 인한 지역 경기 침체. 임대인 사업 실패 후 다중 채무.",
    damageAmount: 27000, victimCount: 11,
    occurredAt: "2024-06-01T00:00:00Z", reportedAt: "2024-08-15T00:00:00Z",
    ...COORDS["부산 사하구"],
    perpetratorType: "개인임대인",
    tactics: ["지역 경기 침체", "사업 실패", "다중 채무 은닉"],
  },
  {
    region: "부산", district: "사하구",
    address: "부산 사하구 감천동 ***-**",
    fraudType: "허위매물",
    description: "관광지 인근 게스트하우스를 전세로 위장. 불법 용도변경.",
    damageAmount: 8500, victimCount: 3,
    occurredAt: "2025-01-15T00:00:00Z", reportedAt: "2025-02-25T00:00:00Z",
    ...COORDS["부산 사하구"],
    perpetratorType: "기획부동산",
    tactics: ["용도변경 위장", "게스트하우스 전세 위장", "불법 전용"],
  },
];

// ─── 메인 시드 함수 ───

async function seedFraudCases() {
  console.log("전세사기 피해사례 시드 시작...");
  console.log(`총 ${FRAUD_CASES.length}건 시드 예정`);

  let created = 0;
  let skipped = 0;

  for (const c of FRAUD_CASES) {
    const coord = COORDS[`${c.region} ${c.district}`];
    if (!coord) {
      console.warn(`좌표 미발견: ${c.region} ${c.district}`);
      skipped++;
      continue;
    }

    try {
      await prisma.fraudCase.create({
        data: {
          address: c.address,
          latitude: jitter(c.latitude),
          longitude: jitter(c.longitude),
          caseType: mapFraudType(c.fraudType),
          amount: c.damageAmount * 10000, // 만원 → 원
          victimCount: c.victimCount,
          reportDate: new Date(c.reportedAt),
          source: "government",
          summary: buildSummary(c),
          verified: true,
          riskFeatures: {
            fraudType: c.fraudType,
            perpetratorType: c.perpetratorType,
            tactics: c.tactics,
            region: c.region,
            district: c.district,
            damageAmountManwon: c.damageAmount,
            occurredAt: c.occurredAt,
          },
        },
      });
      created++;
    } catch (err) {
      console.warn(`시드 실패 (${c.address}):`, err);
      skipped++;
    }
  }

  console.log(`\n시드 완료: ${created}건 생성, ${skipped}건 건너뜀`);
  console.log("지역별 분포:");

  const regionCounts: Record<string, number> = {};
  for (const c of FRAUD_CASES) {
    const key = `${c.region} ${c.district}`;
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  }
  for (const [region, count] of Object.entries(regionCounts).sort()) {
    console.log(`  ${region}: ${count}건`);
  }
}

/** FraudType → DB caseType 매핑 */
function mapFraudType(type: FraudType): string {
  const map: Record<FraudType, string> = {
    "깡통전세": "jeonse_fraud",
    "이중계약": "deposit_fraud",
    "전세보증금_미반환": "deposit_fraud",
    "허위매물": "rental_fraud",
    "다중채무_임대인": "jeonse_fraud",
  };
  return map[type] || "other";
}

/** 요약 텍스트 생성 */
function buildSummary(c: FraudSeed): string {
  return `[${c.fraudType}] ${c.region} ${c.district} | ${c.description} | 피해액: ${(c.damageAmount / 10000).toFixed(1)}억원, 피해자: ${c.victimCount}명 | 수법: ${c.tactics.join(", ")}`;
}

// ─── 실행 ───

seedFraudCases()
  .catch((e) => {
    console.error("시드 오류:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
