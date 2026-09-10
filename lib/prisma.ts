import { PrismaClient } from "@prisma/client";
import {
  PII_FIELDS,
  MODEL_RELATIONS,
  encryptWriteTree,
  decryptReadTree,
} from "./pii-crypto-tree";

// PII 자동 암/복호화 대상·관계 매핑은 lib/pii-crypto-tree.ts에 단일 소스로 둔다.
// (백필 스크립트도 거기서 PII_FIELDS를 import — 여기서 재-export해 기존 import 경로 유지)
export { PII_FIELDS, MODEL_RELATIONS };

// ─── Prisma Client Extensions로 PII 자동 암/복호화 (nested create/include 재귀) ───

function createExtendedClient() {
  const base = new PrismaClient();

  return base.$extends({
    query: {
      $allOperations({ model, args, query }) {
        // PII를 갖거나, PII 모델로 이어지는 관계를 가진 모델만 처리 (그 외는 그대로 통과)
        if (!model || (!PII_FIELDS[model] && !MODEL_RELATIONS[model])) {
          return query(args);
        }

        // 쓰기: data / create / update (nested 포함) 재귀 암호화
        if (args && typeof args === "object") {
          const a = args as Record<string, unknown>;
          if ("data" in a) encryptWriteTree(a.data, model);
          if ("create" in a) encryptWriteTree(a.create, model); // upsert.create
          if ("update" in a) encryptWriteTree(a.update, model); // upsert.update
        }

        // 실행 후 결과 복호화 (nested include 포함)
        return query(args).then((result) => {
          if (Array.isArray(result)) {
            for (const item of result) decryptReadTree(item, model, 0);
          } else {
            decryptReadTree(result, model, 0);
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
