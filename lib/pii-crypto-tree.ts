/**
 * PII 자동 암/복호화 — 트리 변환 (nested create/include 재귀)
 * ────────────────────────────────────────────────────────────
 * lib/prisma.ts의 Prisma Client 확장이 사용하는 순수 변환 로직.
 * 최상위 스칼라뿐 아니라 nested write(`data.rel.create` 등)와
 * nested read(`include`/`select`로 끌어온 관계 객체)까지 재귀로 처리한다.
 *
 * 설계: docs/SECURITY-ENCRYPTION-ARCHITECTURE.md §2 (옵션 A: 재귀 확장) / §7-1
 *  - PII_FIELDS       : 모델별 암호화 대상 스칼라 필드 (단일 소스, 백필도 이걸 순회)
 *  - MODEL_RELATIONS  : 모델 → { 관계필드명: 대상모델 } 선언적 매핑.
 *                        PII 모델에 도달하는 경로만 등록한다(사각지대 없이·과도확장 없이).
 *
 * PrismaClient에 의존하지 않는 순수 함수라 단위 테스트가 용이하다.
 *
 * @module lib/pii-crypto-tree
 */

import { encryptPII, decryptPII } from "./crypto";

// ─── 암호화 대상 필드 (단일 소스) ───
//
// 주의: where(검색)은 이 확장이 처리하지 않는다(암호문은 IV 랜덤이라 contains/정확일치 불가).
// → 암호화 필드로 검색해야 하면 정확일치는 blind index(hashForSearch 컬럼), 부분검색은
//    앱레벨 복호화 필터로 처리한다. 예) AgentClient.clientEmail=clientEmailHash, 통합검색=앱레벨(S5).
// nested create/include는 아래 MODEL_RELATIONS 재귀로 커버된다.
export const PII_FIELDS: Record<string, string[]> = {
  User: ["businessNumber"],
  Analysis: ["address"],
  Asset: ["address"],
  // S5: clientName·clientEmail 암호화. 부분검색은 앱레벨 복호화 필터,
  //     이메일 정확일치·중복체크는 clientEmailHash(blind index)로 처리(where 검색 아님).
  AgentClient: ["clientPhone", "clientName", "clientEmail"],
  NotificationSetting: ["kakaoPhoneNumber", "smsPhoneNumber"],
  // 등기 원문 (평문 중복 제거). write/read 모두 최상위라 안전.
  MonitoredProperty: ["baselineData"],
  RegistryIssueOrder: ["documentText"],
  // S2: 자동확장 안전 검증 완료(write 최상위·read 최상위·where/nested 미사용)
  Listing: ["registryText"], // 매물 등기부 원문
  LawyerPartner: ["phone", "officePhone", "bizNo", "licenseNo"], // 전문가 연락처·사업자·자격번호
  KeepzipCase: ["senderName", "recipientName", "address"], // 내용증명 당사자·주소
  // A2(S4): 전자계약 서명 당사자 정보. nested create/include라 MODEL_RELATIONS 재귀로 처리.
  //   signerRrnPrefix: 생년월일+성별1자리("890101-1"). 생년월일은 개인정보 → 포함.
  EContractSignature: ["signerName", "signerPhone", "signerEmail", "signerRrnPrefix"],
};

// ─── nested 관계 매핑 (모델 → { 관계필드명: 대상모델 }) ───
//
// PII를 가진 모델에 도달하는 경로만 등록한다. 여기 없는 관계는 재귀하지 않는다(정밀 처리).
// 예) EContract.signatures(1:N) ↔ EContractSignature.contract(N:1)
export const MODEL_RELATIONS: Record<string, Record<string, string>> = {
  EContract: { signatures: "EContractSignature" },
  EContractSignature: { contract: "EContract" },
};

// nested include가 아주 깊어도 무한 순회를 막는 안전장치.
// 실제 재귀 깊이는 쿼리 include 중첩 깊이라 유한하지만, 방어적으로 상한을 둔다.
const MAX_DEPTH = 8;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object";

// ─── 쓰기: data-like 객체의 스칼라 + nested 관계 write 재귀 암호화 ───

function encryptScalars(obj: Obj, model: string): void {
  const fields = PII_FIELDS[model];
  if (!fields) return;
  for (const f of fields) {
    const v = obj[f];
    // 이미 v2 암호문이면 재암호화하지 않는다(이중 암호화 방지).
    // 같은 data 객체 재사용/재시도, 복호화된 값의 재저장 등에서 두 번 암호화되는 것을 차단.
    if (typeof v === "string" && v && !v.startsWith("v2:")) obj[f] = encryptPII(v);
  }
}

/**
 * write 페이로드(data / create / update)를 재귀 암호화한다.
 * 배열(createMany.data 등)도 지원. depth는 배열·관계 하강마다 증가하는 상한(MAX_DEPTH) 방어용
 * — 논리적 깊이보다 빨리 증가할 수 있으나(비대칭) 실사용 깊이가 얕아 여유가 크다.
 */
export function encryptWriteTree(data: unknown, model: string, depth = 0): void {
  if (depth > MAX_DEPTH) {
    // silent 누락은 평문 저장으로 이어지므로 최소한 관측 가능해야 한다(값 미출력).
    console.error(`[pii-crypto-tree] write depth>${MAX_DEPTH} 초과 — 암호화 중단(누락 가능): ${model}`);
    return;
  }
  if (Array.isArray(data)) {
    for (const item of data) encryptWriteTree(item, model, depth + 1);
    return;
  }
  if (!isObj(data)) return;

  encryptScalars(data, model);

  const rels = MODEL_RELATIONS[model];
  if (!rels) return;
  for (const [rel, childModel] of Object.entries(rels)) {
    const nested = data[rel];
    if (isObj(nested)) encryptNestedRelationWrite(nested, childModel, depth + 1);
  }
}

/** nested 관계 write 페이로드({create,update,upsert,connectOrCreate,createMany})를 재귀 암호화 */
function encryptNestedRelationWrite(nested: Obj, childModel: string, depth: number): void {
  if (depth > MAX_DEPTH) return;
  const eachItem = (v: unknown, fn: (x: Obj) => void) => {
    if (Array.isArray(v)) {
      for (const el of v) if (isObj(el)) fn(el);
    } else if (isObj(v)) {
      fn(v);
    }
  };

  if ("create" in nested) eachItem(nested.create, (x) => encryptWriteTree(x, childModel, depth + 1));
  if ("createMany" in nested && isObj(nested.createMany)) {
    encryptWriteTree((nested.createMany as Obj).data, childModel, depth + 1);
  }
  // nested update/updateMany는 { where, data } 형태(또는 1:1은 필드 직접) → data 우선
  if ("update" in nested) eachItem(nested.update, (x) => encryptWriteTree("data" in x ? x.data : x, childModel, depth + 1));
  if ("updateMany" in nested) eachItem(nested.updateMany, (x) => encryptWriteTree("data" in x ? x.data : x, childModel, depth + 1));
  if ("upsert" in nested)
    eachItem(nested.upsert, (x) => {
      if (isObj(x.create)) encryptWriteTree(x.create, childModel, depth + 1);
      if (isObj(x.update)) encryptWriteTree(x.update, childModel, depth + 1);
    });
  if ("connectOrCreate" in nested)
    eachItem(nested.connectOrCreate, (x) => {
      if (isObj(x.create)) encryptWriteTree(x.create, childModel, depth + 1);
    });
}

// ─── 읽기: 결과 객체의 스칼라 + nested include 관계 재귀 복호화 ───

/**
 * 쿼리 결과(단일 객체)를 재귀 복호화한다. 배열은 각 요소에 대해 호출할 것.
 */
export function decryptReadTree(node: unknown, model: string, depth = 0): void {
  if (depth > MAX_DEPTH) {
    console.error(`[pii-crypto-tree] read depth>${MAX_DEPTH} 초과 — 복호화 중단: ${model}`);
    return;
  }
  if (!isObj(node)) return;

  const fields = PII_FIELDS[model];
  if (fields) {
    for (const f of fields) {
      if (typeof node[f] === "string" && node[f]) node[f] = decryptPII(node[f] as string);
    }
  }

  const rels = MODEL_RELATIONS[model];
  if (!rels) return;
  for (const [rel, childModel] of Object.entries(rels)) {
    const child = node[rel];
    if (Array.isArray(child)) {
      for (const c of child) decryptReadTree(c, childModel, depth + 1);
    } else if (isObj(child)) {
      decryptReadTree(child, childModel, depth + 1);
    }
  }
}
