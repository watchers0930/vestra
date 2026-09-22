/**
 * VESTRA 국토교통부 실거래가 API 클라이언트 (배럴)
 * ─────────────────────────────────────────
 * 공공데이터포털(data.go.kr)의 국토교통부 실거래가 API 호출.
 * 실제 구현은 lib/molit/* 로 분리되어 있으며, 기존 `@/lib/molit-api` import 경로를
 * 유지하기 위해 여기서 재-export한다.
 *  - molit/types         : 공용 타입
 *  - molit/address-utils : 법정동 코드/필터 추출 + 배치 병렬
 *  - molit/sale          : 매매 실거래
 *  - molit/rent          : 전월세 실거래
 *  - molit/comprehensive : 종합 시세
 *  - molit/molit-data    : XML 파싱·엔드포인트·법정동 맵 (데이터 계층)
 */

export type {
  RealTransaction, PriceResult, RentTransaction, RentPriceResult,
  ComprehensivePriceResult, ResidentialSaleType, ResidentialRentType,
} from "./molit/types";

export { toResidentialType } from "./molit/types";

export { extractLawdCode, extractAddressFilters, batchFetch } from "./molit/address-utils";

export {
  fetchRealTransactions, fetchRecentPrices, fetchGenericSaleTransactions,
  fetchResidentialSaleTransactions, fetchRecentResidentialSalePrices,
} from "./molit/sale";

export {
  fetchAptRentTransactions, fetchResidentialRentTransactions, fetchRecentRentPrices,
} from "./molit/rent";

export { fetchComprehensivePrices } from "./molit/comprehensive";

export {
  LAWD_CODE_MAP, molitFetch, parseTransactions, parseRentTransactions,
  filterTransactions, extractXmlValue, extractVal, MOLIT_ENDPOINTS,
} from "./molit/molit-data";
