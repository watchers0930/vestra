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
    if (typeof obj[f] === "string" && obj[f]) obj[f] = encryptPII(obj[f] as string);
  }
}

/**
 * write 페이로드(data / create / update)를 재귀 암호화한다.
 * 배열(createMany.data 등)도 지원.
 */
export function encryptWriteTree(data: unknown, model: string): void {
  if (Array.isArray(data)) {
    for (const item of data) encryptWriteTree(item, model);
    return;
  }
  if (!isObj(data)) return;

  encryptScalars(data, model);

  const rels = MODEL_RELATIONS[model];
  if (!rels) return;
  for (const [rel, childModel] of Object.entries(rels)) {
    const nested = data[rel];
    if (isObj(nested)) encryptNestedRelationWrite(nested, childModel);
  }
}

/** nested 관계 write 페이로드({create,update,upsert,connectOrCreate,createMany})를 재귀 암호화 */
function encryptNestedRelationWrite(nested: Obj, childModel: string): void {
  const eachItem = (v: unknown, fn: (x: Obj) => void) => {
    if (Array.isArray(v)) {
      for (const el of v) if (isObj(el)) fn(el);
    } else if (isObj(v)) {
      fn(v);
    }
  };

  if ("create" in nested) eachItem(nested.create, (x) => encryptWriteTree(x, childModel));
  if ("createMany" in nested && isObj(nested.createMany)) {
    encryptWriteTree((nested.createMany as Obj).data, childModel);
  }
  // nested update/updateMany는 { where, data } 형태(또는 1:1은 필드 직접) → data 우선
  if ("update" in nested) eachItem(nested.update, (x) => encryptWriteTree("data" in x ? x.data : x, childModel));
  if ("updateMany" in nested) eachItem(nested.updateMany, (x) => encryptWriteTree("data" in x ? x.data : x, childModel));
  if ("upsert" in nested)
    eachItem(nested.upsert, (x) => {
      if (isObj(x.create)) encryptWriteTree(x.create, childModel);
      if (isObj(x.update)) encryptWriteTree(x.update, childModel);
    });
  if ("connectOrCreate" in nested)
    eachItem(nested.connectOrCreate, (x) => {
      if (isObj(x.create)) encryptWriteTree(x.create, childModel);
    });
}

// ─── 읽기: 결과 객체의 스칼라 + nested include 관계 재귀 복호화 ───

/**
 * 쿼리 결과(단일 객체)를 재귀 복호화한다. 배열은 각 요소에 대해 호출할 것.
 */
export function decryptReadTree(node: unknown, model: string, depth = 0): void {
  if (depth > MAX_DEPTH || !isObj(node)) return;

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
