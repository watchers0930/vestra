import { PrismaClient } from "@prisma/client";
import { encryptPII, decryptPII } from "./crypto";

// ─── PII 자동 암호화/복호화 대상 필드 ───

// 주의: where(검색)·nested create는 이 확장이 처리하지 않는다.
// → 검색에 쓰이는 필드(clientName·clientEmail 등)와 nested로 저장되는 필드(EContractSignature)는 넣지 말 것.
// 이 맵은 백필 스크립트(scripts/backfill-pii-encryption.ts)의 단일 소스이기도 하다 → export.
export const PII_FIELDS: Record<string, string[]> = {
  User: ["businessNumber"],
  Analysis: ["address"],
  Asset: ["address"],
  AgentClient: ["clientPhone"], // clientName/clientEmail은 검색에 사용되어 제외
  NotificationSetting: ["kakaoPhoneNumber", "smsPhoneNumber"],
  // 등기 원문 (평문 중복 제거). write는 전부 최상위 data, read도 최상위 결과라 안전.
  // cron 변동감지는 lastHash(평문 해시)로 판정 + 자동복호화된 평문끼리 비교 → 영향 없음.
  // ⚠️ 향후 nested include/select로 이 필드를 끌어오면 자동복호화가 안 되니 최상위 조회만 할 것.
  MonitoredProperty: ["baselineData"],
  RegistryIssueOrder: ["documentText"],
  // S2 추가: 자동확장 안전 검증 완료(write 최상위·read 최상위·where/nested/unique 미사용)
  Listing: ["registryText"], // 매물 등기부 원문
  LawyerPartner: ["phone", "officePhone", "bizNo", "licenseNo"], // 전문가 연락처·사업자·자격번호
  KeepzipCase: ["senderName", "recipientName", "address"], // 내용증명 당사자·주소
};

// ─── Prisma Client Extensions로 PII 자동 암/복호화 ───

function createExtendedClient() {
  const base = new PrismaClient();

  return base.$extends({
    query: {
      $allOperations({ model, args, query }) {
        const fields = model ? PII_FIELDS[model] : undefined;
        if (!fields) return query(args);

        // 쓰기: data 내 PII 필드 암호화
        if (args && "data" in args && args.data) {
          const data = args.data as Record<string, unknown>;
          for (const field of fields) {
            if (typeof data[field] === "string" && data[field]) {
              data[field] = encryptPII(data[field] as string);
            }
          }
        }

        // upsert: create/update 내 PII 필드 암호화
        if (args && "create" in args && args.create) {
          const create = args.create as Record<string, unknown>;
          for (const field of fields) {
            if (typeof create[field] === "string" && create[field]) {
              create[field] = encryptPII(create[field] as string);
            }
          }
        }
        if (args && "update" in args && args.update) {
          const update = args.update as Record<string, unknown>;
          for (const field of fields) {
            if (typeof update[field] === "string" && update[field]) {
              update[field] = encryptPII(update[field] as string);
            }
          }
        }

        // 쿼리 실행 후 결과 복호화
        return query(args).then((result) => {
          if (!result) return result;

          const decryptObj = (obj: Record<string, unknown>) => {
            for (const field of fields) {
              if (typeof obj[field] === "string" && obj[field]) {
                obj[field] = decryptPII(obj[field] as string);
              }
            }
          };

          if (Array.isArray(result)) {
            result.forEach((item) => {
              if (item && typeof item === "object") decryptObj(item);
            });
          } else if (typeof result === "object") {
            decryptObj(result as Record<string, unknown>);
          }

          return result;
        });
      },
    },
  });
}

// ─── 싱글턴 ───

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma || createExtendedClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
