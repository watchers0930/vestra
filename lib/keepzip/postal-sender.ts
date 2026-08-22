/**
 * 집키퍼(KeepZip) 우편 발송 어댑터 — 포스트플러스(PostPlus / (주)포스토피아)
 * ──────────────────────────────────────────────────────────────────────────
 * 변호사 직인이 합성된 내용증명 PDF를 우체국 등기(내용증명)로 발송하고,
 * 접수 상태·등기번호를 조회한다. (설계서 docs/05-KEEPZIP-Design.md §14)
 *
 * 규격 출처: "PostPlus 기업연계 API 2023-05-09.pdf" (API 명세서 v1.1.2)
 *   - 우편 제작 접수 : POST {BASE}/po/api/postplusPstMsrApi.do
 *   - 우편 상태 조회 : POST {BASE}/po/api/postplusPstStatusApi.do
 *   - 전송 형식 : multipart/form-data (apiKey + pstFile[JSON] + pstFile[PDF])
 *   - 응답 : { "결과": "OK" | "ERROR" | "E_xxxxx", "비고": "..." }
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ ⚠️ 실제 발송 전 대장이 처리해야 하는 외부 선결 (코드로 불가):        │
 * │   1) 기업/기관 회원가입 (개인 불가)                                    │
 * │   2) API Key 발급 — 1:1문의 / 1577-8114 (자동발급 아님, 심사)          │
 * │   3) 템플릿 협의 선행 (규격서: "템플릿 협의 후 서비스 이용 가능")      │
 * │   4) 예치금/기관 후불 결제 계약                                        │
 * │   5) 발송 IP 등록 (화이트리스트)                                       │
 * │                                                                        │
 * │ 🔴 Vercel 서버리스는 outbound IP가 유동적 → 발송 IP 화이트리스트와     │
 * │    충돌할 수 있다. Key 발급 시 포스트플러스에 IP 정책을 반드시 확인.   │
 * │    (해결책: Vercel 고정 IP / 프록시 / 별도 발송 워커 경유)             │
 * │                                                                        │
 * │ env: POSTPLUS_API_KEY, POSTPLUS_BASE_URL(기본 t.postplus.co.kr=테스트),│
 * │      POSTPLUS_TEST_MODE(Y/N, 기본 Y)                                   │
 * └──────────────────────────────────────────────────────────────────────┘
 */

/** 발신인(대리 변호사 또는 플랫폼 명의) */
export interface PostalParty {
  name: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  phone: string;
}

/** 수신인(임대인/세입자 등 상대방) — 사건당 1명 이상 */
export interface PostalRecipient {
  name: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  phone?: string;
}

export interface SendCertifiedMailParams {
  /** 연계식별키 — 사건 고유 ID. 중복 접수 방지에 사용(예: KeepzipCase.id) */
  linkCode: string;
  /** 직인 합성 완료 내용증명 PDF */
  pdf: Blob | ArrayBuffer | Uint8Array;
  /** 첨부 PDF 파일명(detail "첨부파일" 값과 일치해야 함) */
  pdfFileName?: string;
  sender: PostalParty;
  recipients: PostalRecipient[];
}

export interface SendResult {
  ok: boolean;
  linkCode: string;
  /** 포스트플러스 원본 응답 */
  raw: unknown;
  /** 실패 시 사유(응답 "비고" 또는 네트워크 오류) */
  error?: string;
}

/** 상태조회 결과 — 상태값: 접수대기|검수|출력|봉입|우체국접수중|제작발송완료|접수취소|확인불가 */
export interface PostalStatusResult {
  ok: boolean;
  status?: string;
  /** "제작발송완료"(=제작/발송 완료·과금 대상)이면 true */
  delivered: boolean;
  startTrackingNo?: string;
  endTrackingNo?: string;
  /** 순번별 등기번호(수취인 여러 명일 때) */
  trackingByIndex?: Record<string, string>;
  raw: unknown;
  error?: string;
}

export interface PostalSenderAdapter {
  sendCertifiedMail(params: SendCertifiedMailParams): Promise<SendResult>;
  getStatus(linkCode: string): Promise<PostalStatusResult>;
}

// ── 상수 (규격서 코드샘플 기준) ─────────────────────────────────────────────

/** 규격서 코드샘플 버전 */
const API_VERSION = "v1.10";
/** 서비스 코드: PST=우편, SMS=문자, KKO=카카오알림톡 */
const SERVICE_POST = "PST";

/**
 * 배달 종류 = 내용증명.
 * ⚠️ 소개 페이지는 "내용증명"을 명시 지원하나, 규격서 상태조회 응답 예시의 배달값은
 *    (일반/등기/준등기/익일특급)만 노출됨. 접수 시 "배달" 필드에 넣을 정확한 문자열은
 *    포스트플러스 템플릿 협의(선결과제)에서 확정한다. 확정 전까지 "내용증명"으로 둔다.
 */
const DELIVERY_CERTIFIED = "내용증명";

/** 우편 제작 접수 API path */
const PATH_SEND = "/po/api/postplusPstMsrApi.do";
/** 우편 제작 상태 조회 API path */
const PATH_STATUS = "/po/api/postplusPstStatusApi.do";

/** master 컬럼 순서 (규격서 코드샘플과 동일 — 순서 변경 금지) */
const MASTER_COLS = [
  "버전", "테스트여부", "서비스", "연계식별키", "봉투", "봉투창", "흑백칼라",
  "단면양면", "배달", "템플릿코드", "템플릿출력여부", "수취인수", "여백생성유무",
  "주소페이지유무", "맞춤자제유무", "메일머지유무", "동봉물유무", "동봉물페이지수",
  "스테이플러유무", "로고파일", "발송인명", "발송인우편번호", "발송인주소",
  "발송인상세주소", "발송인전화번호",
];

/** detail 컬럼 순서 (첨부파일 방식 — 가변 데이터 미사용) */
const DETAIL_COLS = [
  "순번", "이름", "우편번호", "주소", "상세주소", "전화번호", "첨부파일",
];

// ── 유틸 ────────────────────────────────────────────────────────────────────

function getConfig() {
  const apiKey = process.env.POSTPLUS_API_KEY ?? "";
  // 기본값 = 테스트 서버. 운영 전환 시 운영 서브도메인으로 교체(포스트플러스 안내).
  const baseUrl = (process.env.POSTPLUS_BASE_URL ?? "https://t.postplus.co.kr").replace(/\/$/, "");
  // 미설정 시 안전하게 테스트 발송(Y). 운영 발송은 명시적으로 N 설정.
  const testMode = (process.env.POSTPLUS_TEST_MODE ?? "Y").toUpperCase() === "N" ? "N" : "Y";
  return { apiKey, baseUrl, testMode };
}

async function toBlob(pdf: Blob | ArrayBuffer | Uint8Array): Promise<Blob> {
  if (pdf instanceof Blob) return pdf;
  return new Blob([pdf as BlobPart], { type: "application/pdf" });
}

/** 포스트플러스 응답의 "결과" 값이 성공(OK)인지 판정 */
function isOk(raw: Record<string, unknown> | null): boolean {
  return !!raw && String(raw["결과"] ?? "").toUpperCase() === "OK";
}

// ── 포스트플러스 구현 ────────────────────────────────────────────────────────

class PostPlusSender implements PostalSenderAdapter {
  async sendCertifiedMail(params: SendCertifiedMailParams): Promise<SendResult> {
    const { apiKey, baseUrl, testMode } = getConfig();
    if (!apiKey) {
      return { ok: false, linkCode: params.linkCode, raw: null, error: "POSTPLUS_API_KEY 미설정 (발급 후 .env 설정 필요)" };
    }
    if (!params.recipients?.length) {
      return { ok: false, linkCode: params.linkCode, raw: null, error: "수신인이 없습니다" };
    }

    const fileName = params.pdfFileName ?? `keepzip_${params.linkCode}.pdf`;

    // master rows — MASTER_COLS 순서와 1:1 대응
    const masterRows = [
      API_VERSION,                    // 버전
      testMode,                       // 테스트여부 (Y/N)
      SERVICE_POST,                   // 서비스
      params.linkCode,               // 연계식별키
      "소봉투",                       // 봉투
      "이중창",                       // 봉투창
      "흑백",                         // 흑백칼라
      "단면",                         // 단면양면
      DELIVERY_CERTIFIED,            // 배달 = 내용증명
      "",                             // 템플릿코드 (첨부파일 방식 → 미사용)
      "N",                            // 템플릿출력여부
      params.recipients.length,      // 수취인수
      "N",                            // 여백생성유무
      "N",                            // 주소페이지유무
      "N",                            // 맞춤자제유무
      "N",                            // 메일머지유무
      "N",                            // 동봉물유무
      0,                              // 동봉물페이지수
      "N",                            // 스테이플러유무
      "N",                            // 로고파일
      params.sender.name,            // 발송인명
      params.sender.zipCode,         // 발송인우편번호
      params.sender.address,         // 발송인주소
      params.sender.addressDetail,   // 발송인상세주소
      params.sender.phone,           // 발송인전화번호
    ];

    // detail rows — 수취인별 (DETAIL_COLS 순서)
    const detailRows = params.recipients.map((r, i) => [
      String(i + 1),                 // 순번
      r.name,                        // 이름
      r.zipCode,                     // 우편번호
      r.address,                     // 주소
      r.addressDetail,               // 상세주소
      r.phone ?? "",                 // 전화번호
      fileName,                      // 첨부파일 (아래 pstFile PDF의 filename과 일치)
    ]);

    const pst = {
      master: { cols: MASTER_COLS, rows: masterRows },
      detail: { cols: DETAIL_COLS, rows: detailRows },
    };

    // multipart/form-data: apiKey + pstFile(json) + pstFile(pdf)
    const form = new FormData();
    form.append("apiKey", apiKey);
    form.append("pstFile", new Blob([JSON.stringify(pst)], { type: "application/json" }), "pst.json");
    form.append("pstFile", await toBlob(params.pdf), fileName);

    try {
      const res = await fetch(`${baseUrl}${PATH_SEND}`, { method: "POST", body: form });
      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const ok = res.ok && isOk(raw);
      return {
        ok,
        linkCode: params.linkCode,
        raw,
        error: ok ? undefined : String(raw?.["비고"] ?? `HTTP ${res.status}`),
      };
    } catch (e) {
      return { ok: false, linkCode: params.linkCode, raw: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async getStatus(linkCode: string): Promise<PostalStatusResult> {
    const { apiKey, baseUrl } = getConfig();
    if (!apiKey) {
      return { ok: false, delivered: false, raw: null, error: "POSTPLUS_API_KEY 미설정" };
    }

    const form = new FormData();
    form.append("apiKey", apiKey);
    form.append("inputCode", linkCode);

    try {
      const res = await fetch(`${baseUrl}${PATH_STATUS}`, { method: "POST", body: form });
      const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const ok = res.ok && isOk(raw);
      if (!ok) {
        return { ok: false, delivered: false, raw, error: String(raw?.["비고"] ?? `HTTP ${res.status}`) };
      }

      const status = raw?.["상태"] != null ? String(raw["상태"]) : undefined;
      // "순번등기번호": [{ "1": "..." }, { "2": "..." }] → 평탄화
      const trackingByIndex: Record<string, string> = {};
      const seq = raw?.["순번등기번호"];
      if (Array.isArray(seq)) {
        for (const entry of seq) {
          if (entry && typeof entry === "object") {
            for (const [k, v] of Object.entries(entry as Record<string, unknown>)) trackingByIndex[k] = String(v);
          }
        }
      }

      return {
        ok: true,
        status,
        delivered: status === "제작발송완료",
        startTrackingNo: raw?.["시작등기번호"] != null ? String(raw["시작등기번호"]) : undefined,
        endTrackingNo: raw?.["종료등기번호"] != null ? String(raw["종료등기번호"]) : undefined,
        trackingByIndex: Object.keys(trackingByIndex).length ? trackingByIndex : undefined,
        raw,
      };
    } catch (e) {
      return { ok: false, delivered: false, raw: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

/**
 * 발송 어댑터 인스턴스.
 * 벤더 교체 시 이 팩터리만 다른 구현으로 바꾸면 된다(설계서 §14.2 벤더 종속 회피).
 */
export const postalSender: PostalSenderAdapter = new PostPlusSender();
