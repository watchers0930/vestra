import { PrismaClient } from "@prisma/client";
import { encryptPII, decryptPII } from "./crypto";

// ─── PII 자동 암호화/복호화 대상 필드 ───

const PII_FIELDS: Record<string, string[]> = {
  User: ["businessNumber"],
  Analysis: ["address"],
  Asset: ["address"],
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
