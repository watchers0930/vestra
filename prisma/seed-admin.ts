/**
 * 관리자 계정 시드 스크립트
 *
 * 실행: npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("1111", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vestra.kr" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      dailyLimit: 9999,
    },
    create: {
      email: "admin@vestra.kr",
      name: "관리자",
      password: hashedPassword,
      role: "ADMIN",
      dailyLimit: 9999,
      verifyStatus: "verified",
    },
  });

  console.log("관리자 계정 생성 완료:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
