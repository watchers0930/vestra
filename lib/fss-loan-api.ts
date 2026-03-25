/**
 * 금융감독원 금융상품 통합비교공시 API — 전세자금대출 금리 수집
 *
 * 10일 간격 Cron으로 호출하여 5대 은행 전세대출 금리를 갱신합니다.
 * FSS_API_KEY 환경변수 필요 (https://finlife.fss.or.kr 에서 발급)
 */

import { apiCache, APICache } from "./api-cache";

const FSS_BASE = "https://finlife.fss.or.kr/finlifeapi";
const CACHE_KEY = "fss-loan-rates";
const CACHE_TTL = 10 * 24 * 60 * 60 * 1000; // 10일

// 5대 시중은행 매칭 키워드
const BANK_MATCH: Record<string, string[]> = {
  "KB국민": ["국민은행"],
  "신한": ["신한은행"],
  "하나": ["하나은행"],
  "우리": ["우리은행"],
  "NH농협": ["농협은행"],
};

export interface FSSLoanProduct {
  bankName: string;         // 표시용 은행명 (KB국민, 신한 등)
  productName: string;      // 상품명
  rateMin: number;          // 최저금리
  rateMax: number;          // 최고금리
  loanLimit: string;        // 대출한도 (텍스트)
  updatedAt: string;        // 공시일
}

export interface FSSLoanRates {
  products: FSSLoanProduct[];
  fetchedAt: string;        // 수집 시각
  dataSource: "fss" | "fallback";
}

/** 캐시된 FSS 금리 데이터 반환 (없으면 null) */
export function getCachedRates(): FSSLoanRates | null {
  return apiCache.get<FSSLoanRates>(CACHE_KEY);
}

/** FSS API에서 전세대출 금리 수집 + 캐시 저장 */
export async function fetchFSSLoanRates(): Promise<FSSLoanRates> {
  const apiKey = process.env.FSS_API_KEY;
  if (!apiKey) {
    console.warn("[FSS-LOAN] FSS_API_KEY 미설정 — 폴백 데이터 사용");
    return { products: [], fetchedAt: new Date().toISOString(), dataSource: "fallback" };
  }

  try {
    const url = `${FSS_BASE}/rentHouseLoanProductsSearch.json?auth=${apiKey}&topFinGrpNo=020000&pageNo=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VESTRA/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`FSS API ${res.status}`);
    const data = await res.json();

    if (data.result?.err_cd !== "000") {
      throw new Error(`FSS error: ${data.result?.err_msg}`);
    }

    const baseList = data.result?.baseList || [];
    const optionList = data.result?.optionList || [];

    const products: FSSLoanProduct[] = [];

    for (const base of baseList) {
      // 5대 은행 매칭
      let matchedBank: string | null = null;
      for (const [displayName, keywords] of Object.entries(BANK_MATCH)) {
        if (keywords.some((kw) => base.kor_co_nm?.includes(kw.replace("은행", "")))) {
          matchedBank = displayName;
          break;
        }
      }
      if (!matchedBank) continue;

      // 해당 상품의 금리 옵션 조회
      const options = optionList.filter(
        (o: any) => o.fin_co_no === base.fin_co_no && o.fin_prdt_cd === base.fin_prdt_cd
      );

      const rates = options
        .flatMap((o: any) => [o.lend_rate_min, o.lend_rate_max])
        .filter((r: any) => r != null && r > 0);

      if (rates.length === 0) continue;

      products.push({
        bankName: matchedBank,
        productName: base.fin_prdt_nm || "",
        rateMin: Math.min(...rates),
        rateMax: Math.max(...rates),
        loanLimit: base.loan_lmt || "",
        updatedAt: base.dcls_strt_day || "",
      });
    }

    const result: FSSLoanRates = {
      products,
      fetchedAt: new Date().toISOString(),
      dataSource: "fss",
    };

    apiCache.set(CACHE_KEY, result, CACHE_TTL);
    console.log(`[FSS-LOAN] ${products.length}개 상품 금리 갱신 완료`);
    return result;
  } catch (err) {
    console.error("[FSS-LOAN] API 호출 실패:", err);
    return { products: [], fetchedAt: new Date().toISOString(), dataSource: "fallback" };
  }
}

/** 특정 은행의 최저/최고 금리 반환 */
export function getBankRateRange(
  rates: FSSLoanRates,
  bankName: string
): { min: number; max: number } | null {
  const bankProducts = rates.products.filter((p) => p.bankName === bankName);
  if (bankProducts.length === 0) return null;

  return {
    min: Math.min(...bankProducts.map((p) => p.rateMin)),
    max: Math.max(...bankProducts.map((p) => p.rateMax)),
  };
}
